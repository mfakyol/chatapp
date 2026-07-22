import { describe, it, expect } from 'vitest';
import { createSlidingWindow } from '../src/utils/slidingWindow';

describe('createSlidingWindow', () => {
  it('allows up to the limit then blocks within the window', () => {
    const allow = createSlidingWindow(3, 1000);
    expect(allow(0)).toBe(true);
    expect(allow(100)).toBe(true);
    expect(allow(200)).toBe(true);
    expect(allow(300)).toBe(false); // 4th within 1s
  });

  it('permits again once old hits fall outside the window', () => {
    const allow = createSlidingWindow(2, 1000);
    expect(allow(0)).toBe(true);
    expect(allow(500)).toBe(true);
    expect(allow(900)).toBe(false);
    // 1600 is >1000ms after the first hit (0) → that hit expires, room for one more
    expect(allow(1600)).toBe(true);
  });
});
