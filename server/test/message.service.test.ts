import { describe, it, expect } from 'vitest';
import Conversation from '../src/models/Conversation';
import ConversationMember from '../src/models/ConversationMember';
import Message from '../src/models/Message';
import User, { UserDocument } from '../src/models/User';
import {
  createMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
} from '../src/services/message.service';
import { markConversationRead } from '../src/services/conversation.service';
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
  const convo = await Conversation.create({ type: 'direct', createdBy: a._id });
  await ConversationMember.insertMany([
    { conversation: convo._id, user: a._id, role: 'member' },
    { conversation: convo._id, user: b._id, role: 'member' },
  ]);
  return convo;
}

describe('message.service', () => {
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

  it('createMessage rejects a non-member with a 404 AppError', async () => {
    const a = await makeUser('a');
    const b = await makeUser('b');
    const outsider = await makeUser('c');
    const convo = await directConversation(a, b);

    await expect(
      createMessage(outsider, convo._id.toString(), { content: 'hi' }, ioStub)
    ).rejects.toMatchObject({ status: 404 });
  });

  it('createMessage is idempotent on clientTempId', async () => {
    const a = await makeUser('a');
    const b = await makeUser('b');
    const convo = await directConversation(a, b);

    const [first, second] = [
      await createMessage(a, convo._id.toString(), { content: 'x', clientTempId: 't1' }, ioStub),
      await createMessage(a, convo._id.toString(), { content: 'x', clientTempId: 't1' }, ioStub),
    ];

    expect(second._id.toString()).toBe(first._id.toString());
    expect(await Message.countDocuments({ conversation: convo._id })).toBe(1);
  });

  it('markConversationRead advances the lastReadAt pointer', async () => {
    const a = await makeUser('a');
    const b = await makeUser('b');
    const convo = await directConversation(a, b);
    await createMessage(b, convo._id.toString(), { content: 'unread' }, ioStub);

    const before = await ConversationMember.findOne({ conversation: convo._id, user: a._id });
    expect(before!.lastReadAt.getTime()).toBe(0);

    await markConversationRead(a, convo._id.toString(), ioStub);

    const after = await ConversationMember.findOne({ conversation: convo._id, user: a._id });
    expect(after!.lastReadAt.getTime()).toBeGreaterThan(0);
  });

  it('toggleReaction adds, groups, and removes reactions', async () => {
    const a = await makeUser('a');
    const b = await makeUser('b');
    const convo = await directConversation(a, b);
    const msg = await createMessage(a, convo._id.toString(), { content: 'react to me' }, ioStub);
    const id = msg._id.toString();

    await toggleReaction(a, convo._id.toString(), id, '👍', ioStub);
    await toggleReaction(b, convo._id.toString(), id, '👍', ioStub);
    let reloaded = await Message.findById(id);
    expect(reloaded?.reactions).toHaveLength(1);
    expect(reloaded?.reactions[0].users).toHaveLength(2);

    await toggleReaction(a, convo._id.toString(), id, '👍', ioStub);
    reloaded = await Message.findById(id);
    expect(reloaded?.reactions[0].users).toHaveLength(1);

    await toggleReaction(b, convo._id.toString(), id, '👍', ioStub);
    reloaded = await Message.findById(id);
    expect(reloaded?.reactions).toHaveLength(0);
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
