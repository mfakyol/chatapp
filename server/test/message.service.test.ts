import { describe, it, expect } from 'vitest';
import Conversation from '../src/models/Conversation';
import Message from '../src/models/Message';
import User, { UserDocument } from '../src/models/User';
import {
  createMessage,
  markConversationRead,
  editMessage,
  deleteMessage,
  toggleReaction,
} from '../src/services/message.service';
import { AppError } from '../src/errors/AppError';
import { ioStub } from './helpers';

let counter = 0;
async function makeUser(name: string): Promise<UserDocument> {
  counter += 1;
  return User.create({
    username: `${name}-user-${counter}`,
    email: `${name}${counter}@test.co`,
    password: 'secret6',
    firstName: name,
    lastName: 'X',
  });
}

async function directConversation(a: UserDocument, b: UserDocument) {
  return Conversation.create({ isGroup: false, participants: [a._id, b._id], createdBy: a._id });
}

describe('message.service (socket-shared logic)', () => {
  it('createMessage persists, sets lastMessage, and populates the sender', async () => {
    const a = await makeUser('a');
    const b = await makeUser('b');
    const convo = await directConversation(a, b);

    const msg = await createMessage(a, convo._id.toString(), { content: '  hello  ' }, ioStub);

    expect(msg.content).toBe('hello');
    expect((msg.sender as unknown as { username: string }).username).toBe(a.username);

    const reloaded = await Conversation.findById(convo._id);
    expect(reloaded?.lastMessage?.toString()).toBe(msg._id.toString());
  });

  it('createMessage rejects a non-participant with a 404 AppError', async () => {
    const a = await makeUser('a');
    const b = await makeUser('b');
    const outsider = await makeUser('c');
    const convo = await directConversation(a, b);

    await expect(
      createMessage(outsider, convo._id.toString(), { content: 'hi' }, ioStub)
    ).rejects.toMatchObject({ status: 404 });
  });

  it('markConversationRead is idempotent under concurrent calls', async () => {
    const a = await makeUser('a');
    const b = await makeUser('b');
    const convo = await directConversation(a, b);

    // b sends two messages
    await createMessage(b, convo._id.toString(), { content: 'one' }, ioStub);
    await createMessage(b, convo._id.toString(), { content: 'two' }, ioStub);

    await Promise.all([
      markConversationRead(a, convo._id.toString(), ioStub),
      markConversationRead(a, convo._id.toString(), ioStub),
    ]);

    const msgs = await Message.find({ conversation: convo._id });
    for (const m of msgs) {
      expect(m.readBy.filter((r) => r.user.equals(a._id))).toHaveLength(1);
    }
  });

  it('editMessage forbids editing another user’s message', async () => {
    const a = await makeUser('a');
    const b = await makeUser('b');
    const convo = await directConversation(a, b);
    const msg = await createMessage(a, convo._id.toString(), { content: 'mine' }, ioStub);

    await expect(
      editMessage(b, convo._id.toString(), msg._id.toString(), 'hacked', ioStub)
    ).rejects.toBeInstanceOf(AppError);

    const edited = await editMessage(a, convo._id.toString(), msg._id.toString(), 'edited', ioStub);
    expect(edited.content).toBe('edited');
    expect(edited.editedAt).toBeInstanceOf(Date);
  });

  it('toggleReaction adds, groups, and removes reactions', async () => {
    const a = await makeUser('a');
    const b = await makeUser('b');
    const convo = await directConversation(a, b);
    const msg = await createMessage(a, convo._id.toString(), { content: 'react to me' }, ioStub);
    const id = msg._id.toString();

    // a adds 👍
    await toggleReaction(a, convo._id.toString(), id, '👍', ioStub);
    // b adds 👍 → grouped under the same emoji
    await toggleReaction(b, convo._id.toString(), id, '👍', ioStub);
    let reloaded = await Message.findById(id);
    expect(reloaded?.reactions).toHaveLength(1);
    expect(reloaded?.reactions[0].emoji).toBe('👍');
    expect(reloaded?.reactions[0].users).toHaveLength(2);

    // a toggles 👍 off → only b remains
    await toggleReaction(a, convo._id.toString(), id, '👍', ioStub);
    reloaded = await Message.findById(id);
    expect(reloaded?.reactions[0].users).toHaveLength(1);

    // b toggles 👍 off → group removed entirely
    await toggleReaction(b, convo._id.toString(), id, '👍', ioStub);
    reloaded = await Message.findById(id);
    expect(reloaded?.reactions).toHaveLength(0);
  });

  it('deleteMessage soft-deletes (clears content, sets deletedAt)', async () => {
    const a = await makeUser('a');
    const b = await makeUser('b');
    const convo = await directConversation(a, b);
    const msg = await createMessage(a, convo._id.toString(), { content: 'bye' }, ioStub);

    await deleteMessage(a, convo._id.toString(), msg._id.toString(), ioStub);

    const reloaded = await Message.findById(msg._id);
    expect(reloaded?.content).toBe('');
    expect(reloaded?.deletedAt).toBeInstanceOf(Date);
  });
});
