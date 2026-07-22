import User, { USERNAME_REGEX, UserDocument } from '../models/User';
import { badRequest, conflict } from '../errors/AppError';

export interface RegisterInput {
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

export async function registerUser(input: RegisterInput): Promise<UserDocument> {
  const { username, email, password, firstName, lastName } = input;

  if (!username || !email || !password || !firstName || !lastName) {
    throw badRequest('All fields are required');
  }
  if (!USERNAME_REGEX.test(username.toLowerCase())) {
    throw badRequest(
      'Username must be 3-20 characters, lowercase letters, numbers, - and _ only'
    );
  }
  if (password.length < 6) {
    throw badRequest('Password must be at least 6 characters');
  }

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
