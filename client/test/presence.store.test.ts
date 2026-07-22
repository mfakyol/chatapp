import { describe, it, expect, beforeEach } from 'vitest';
import { usePresenceStore } from '@/stores/presence.store';

describe('presence store', () => {
  beforeEach(() => {
    usePresenceStore.setState({ presence: {} });
  });

  it('records and overwrites a user presence entry', () => {
    usePresenceStore.getState().setPresence('u1', { isOnline: true });
    expect(usePresenceStore.getState().presence.u1).toEqual({ isOnline: true });

    usePresenceStore.getState().setPresence('u1', { isOnline: false, lastSeen: '2026-01-01' });
    expect(usePresenceStore.getState().presence.u1).toEqual({
      isOnline: false,
      lastSeen: '2026-01-01',
    });
  });

  it('keeps other users untouched', () => {
    usePresenceStore.getState().setPresence('u1', { isOnline: true });
    usePresenceStore.getState().setPresence('u2', { isOnline: false });
    expect(Object.keys(usePresenceStore.getState().presence).sort()).toEqual(['u1', 'u2']);
  });
});
