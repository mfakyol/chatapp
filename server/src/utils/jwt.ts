import jwt, { SignOptions } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;
}

/** Sign a short-lived access token carrying only the user id. */
export function signToken(user: { _id: Types.ObjectId }): string {
  const options: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ sub: user._id.toString() }, env.jwtSecret, options);
}

/** Verify and decode a token, returning its payload or throwing. */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
