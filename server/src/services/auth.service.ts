import User, { UserDocument } from '../models/User';
import { conflict } from '../errors/AppError';
import type { RegisterBody } from '../schemas/auth.schema';

/** Create a user from a request body already validated by `registerSchema`. */
export async function registerUser(input: RegisterBody): Promise<UserDocument> {
  const { username, email, password, firstName, lastName } = input;

  const existing = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });
  if (existing) {
    const field = existing.email === email.toLowerCase() ? 'email' : 'username';
    throw conflict(`This ${field} is already taken`);
  }

  return User.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    firstName,
    lastName,
  });
}
