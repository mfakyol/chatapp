const passport = require('passport');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');

async function register(req, res, next) {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!User.USERNAME_REGEX.test(username.toLowerCase())) {
      return res.status(400).json({
        message: 'Username must be 3-20 characters, lowercase letters, numbers, - and _ only',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({ message: `This ${field} is already taken` });
    }

    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
    });

    const token = signToken(user);
    return res.status(201).json({ token, user: user.toPublicJSON() });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(409).json({ message: `This ${field} is already taken` });
    }
    return next(err);
  }
}

function login(req, res, next) {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: info?.message || 'Invalid credentials' });

    const token = signToken(user);
    return res.json({ token, user: user.toPublicJSON() });
  })(req, res, next);
}

function me(req, res) {
  res.json({ user: req.user.toPublicJSON() });
}

module.exports = { register, login, me };
