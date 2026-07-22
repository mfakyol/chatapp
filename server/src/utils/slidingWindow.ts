/**
 * In-memory per-instance sliding-window rate limiter. Create one per socket
 * connection; each call records a hit and returns whether it was allowed.
 */
export function createSlidingWindow(limit: number, windowMs: number) {
  const hits: number[] = [];
  return function tryAcquire(now: number = Date.now()): boolean {
    while (hits.length > 0 && now - hits[0] > windowMs) hits.shift();
    if (hits.length >= limit) return false;
    hits.push(now);
    return true;
  };
}
