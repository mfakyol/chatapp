import User, { UserDocument } from '../models/User';

/**
 * Tiny TTL cache in front of the per-request `User.findById` done by the auth
 * guard and the socket handshake. User documents are effectively immutable
 * while a session lives (no profile editing yet), so a short TTL is safe; call
 * {@link invalidateUser} from any future user-mutation path.
 */
const TTL_MS = 30_000;
const MAX_ENTRIES = 1000;

const cache = new Map<string, { user: UserDocument; expires: number }>();

export async function loadUser(userId: string): Promise<UserDocument | null> {
  const hit = cache.get(userId);
  if (hit && hit.expires > Date.now()) return hit.user;

  const user = await User.findById(userId);
  if (user) {
    if (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    cache.set(userId, { user, expires: Date.now() + TTL_MS });
  } else {
    cache.delete(userId);
  }
  return user;
}

export function invalidateUser(userId: string): void {
  cache.delete(userId);
}
