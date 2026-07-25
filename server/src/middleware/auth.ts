import type { Request, RequestHandler } from 'express';
import type { UserDocument } from '../models/User';
import { loadUser } from '../utils/userCache';

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await loadUser(userId);
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

export function currentUser(req: Request): UserDocument {
  return req.user as UserDocument;
}
