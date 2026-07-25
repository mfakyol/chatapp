class PresenceTracker {
  private connections = new Map<string, number>();

  up(userId: string): boolean {
    const next = (this.connections.get(userId) ?? 0) + 1;
    this.connections.set(userId, next);
    return next === 1;
  }

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
