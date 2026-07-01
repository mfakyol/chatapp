const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const User = require('../models/User');

passport.use(
  'local',
  new LocalStrategy(
    { usernameField: 'identifier', passwordField: 'password' },
    async (identifier, password, done) => {
      try {
        const user = await User.findOne({
          $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
        });
        if (!user) return done(null, false, { message: 'Invalid credentials' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return done(null, false, { message: 'Invalid credentials' });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(
  'jwt',
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        const user = await User.findById(payload.sub);
        if (!user) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

module.exports = passport;
