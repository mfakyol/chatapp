import type { Request, RequestHandler } from 'express';
import passport from '../config/passport';
import type { UserDocument } from '../models/User';

/** JWT bearer guard. On success attaches the user document to `req.user`. */
export const requireAuth: RequestHandler = (req, res, next) => {
  passport.authenticate(
    'jwt',
    { session: false },
    (err: unknown, user: UserDocument | false) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      req.user = user;
      next();
    }
  )(req, res, next);
};

/** Typed accessor for the authenticated user on a guarded route. */
export function currentUser(req: Request): UserDocument {
  return req.user as UserDocument;
}
