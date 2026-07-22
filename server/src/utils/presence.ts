/**
 * In-memory presence tracker. Reference-counted per user so multiple tabs work
 * correctly: a user is offline only when their LAST connection drops. Only
 * `lastSeen` is persisted (on the 1→0 transition, by the socket layer).
 *
 * Single-instance by design; the interface is the seam where a Redis-backed
 * implementation slots in for multi-instance deployments.
 */
class PresenceTracker {
  private connections = new Map<string, number>();

  /** Register a connection. Returns true if the user just came online (0→1). */
  up(userId: string): boolean {
    const next = (this.connections.get(userId) ?? 0) + 1;
    this.connections.set(userId, next);
    return next === 1;
  }

  /** Unregister a connection. Returns true if the user just went offline (1→0). */
  down(userId: string): boolean {
    const current = this.connections.get(userId) ?? 0;
    if (current <= 1) {
      this.connections.delete(userId);
      return current === 1;
    }
    this.connections.set(userId, current - 1);
    return false;
  }

  isOnline(userId: string): boolean {
    return (this.connections.get(userId) ?? 0) > 0;
  }
}

export const presence = new PresenceTracker();
