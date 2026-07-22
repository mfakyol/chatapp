import { describe, it, expect, vi, afterEach } from 'vitest';
import { request } from '@/lib/api';

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('request()', () => {
  it('returns a success result on 2xx', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { hello: 'world' }));
    const res = await request<{ hello: string }>('/thing');
    expect(res).toEqual({ success: true, data: { hello: 'world' } });
  });

  it('returns a failure result with the server message on non-2xx', async () => {
    vi.stubGlobal('fetch', mockFetch(400, { message: 'Bad thing' }));
    const res = await request('/thing');
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toBe('Bad thing');
  });

  it('returns a failure result when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const res = await request('/thing');
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toBe('network down');
  });
});
