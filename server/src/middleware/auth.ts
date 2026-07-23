import type { Request, RequestHandler } from 'express';
import User, { UserDocument } from '../models/User';

/**
 * Session guard: resolves the user from the server-side session (httpOnly
 * cookie). On success attaches the user document to `req.user`.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/** Typed accessor for the authenticated user on a guarded route. */
export function currentUser(req: Request): UserDocument {
  return req.user as UserDocument;
}
