import { describe, it, expect } from 'vitest';
import { upsertMessage, markDeleted, replaceMessage, setReactions } from '@/lib/messageListOps';
import { Message } from '@/types';

const msg = (id: string, extra: Partial<Message> = {}): Message => ({
  _id: id,
  conversation: 'c1',
  sender: { username: 'alice', firstName: 'Al', lastName: 'Ice' },
  content: `content-${id}`,
  createdAt: '2026-01-01T00:00:00.000Z',
  reactions: [],
  ...extra,
});

describe('upsertMessage', () => {
  it('appends a new message', () => {
    const next = upsertMessage([msg('a')], msg('b'));
    expect(next.map((m) => m._id)).toEqual(['a', 'b']);
  });

  it('reconciles an optimistic bubble by clientTempId (temp _id case)', () => {
    const temp = msg('tmp-1', { clientTempId: 'tmp-1', pending: true });
    const server = msg('real-1', { clientTempId: 'tmp-1' });
    const next = upsertMessage([msg('a'), temp], server);
    expect(next.map((m) => m._id)).toEqual(['a', 'real-1']);
    expect(next[1].pending).toBeUndefined();
  });

  it('is idempotent when the broadcast arrives after the REST echo', () => {
    const server = msg('real-1', { clientTempId: 'tmp-1' });
    const once = upsertMessage([msg('a')], server);
    const twice = upsertMessage(once, server);
    expect(twice).toHaveLength(2);
  });

  it('updates in place by _id', () => {
    const edited = msg('a', { content: 'edited' });
    const next = upsertMessage([msg('a'), msg('b')], edited);
    expect(next[0].content).toBe('edited');
    expect(next).toHaveLength(2);
  });
});

describe('markDeleted', () => {
  it('clears content/attachment and stamps deletedAt', () => {
    const withFile = msg('a', {
      attachment: { url: '/u', fileName: 'f', mimeType: 'text/plain', size: 1 },
    });
    const next = markDeleted([withFile, msg('b')], 'a');
    expect(next[0].content).toBe('');
    expect(next[0].attachment).toBeUndefined();
    expect(next[0].deletedAt).toBeTruthy();
    expect(next[1].deletedAt).toBeUndefined();
  });
});

describe('replaceMessage', () => {
  it('swaps only the target message', () => {
    const next = replaceMessage([msg('a'), msg('b')], 'b', msg('b', { content: 'new' }));
    expect(next[1].content).toBe('new');
    expect(next[0].content).toBe('content-a');
  });
});

describe('setReactions', () => {
  it('applies reactions to the target message only', () => {
    const reactions = [{ emoji: '👍', users: ['u1'] }];
    const next = setReactions([msg('a'), msg('b')], 'a', reactions);
    expect(next[0].reactions).toEqual(reactions);
    expect(next[1].reactions).toEqual([]);
  });
});
