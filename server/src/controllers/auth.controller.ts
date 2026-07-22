import type { RequestHandler } from 'express';
import passport from '../config/passport';
import { registerUser } from '../services/auth.service';
import { signToken } from '../utils/jwt';
import { currentUser } from '../middleware/auth';
import type { UserDocument } from '../models/User';

export const register: RequestHandler = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);
    res.status(201).json({ token: signToken(user), user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

export const login: RequestHandler = (req, res, next) => {
  passport.authenticate(
    'local',
    { session: false },
    (err: unknown, user: UserDocument | false, info?: { message?: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      res.json({ token: signToken(user), user: user.toPublicJSON() });
    }
  )(req, res, next);
};

export const me: RequestHandler = (req, res) => {
  res.json({ user: currentUser(req).toPublicJSON() });
};
