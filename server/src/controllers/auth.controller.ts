import type { Request, RequestHandler } from 'express';
import passport from '../config/passport';
import { registerUser } from '../services/auth.service';
import { currentUser } from '../middleware/auth';
import type { UserDocument } from '../models/User';

function establishSession(req: Request, user: UserDocument): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user._id.toString();
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

export const register: RequestHandler = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);
    await establishSession(req, user);
    res.status(201).json({ user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

export const login: RequestHandler = (req, res, next) => {
  passport.authenticate(
    'local',
    { session: false },
    async (err: unknown, user: UserDocument | false, info?: { message?: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      try {
        await establishSession(req, user);
        res.json({ user: user.toPublicJSON() });
      } catch (sessionErr) {
        next(sessionErr);
      }
    }
  )(req, res, next);
};

export const logout: RequestHandler = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.json({ message: 'Logged out' });
  });
};

export const me: RequestHandler = (req, res) => {
  res.json({ user: currentUser(req).toPublicJSON() });
};
