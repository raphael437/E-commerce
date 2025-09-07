const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');

// Check if Google OAuth environment variables are set
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: 'http://localhost:3000/api/v1/users/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Find by google id
          let user = await User.findOne({ where: { googleId: profile.id } });

          // If no user try to find by email
          if (!user) {
            const email = profile.emails?.[0]?.value || '';

            if (email) {
              const existingByEmail = await User.findOne({ where: { email } });
              if (existingByEmail) {
                existingByEmail.googleId = profile.id;
                if (!existingByEmail.image) {
                  existingByEmail.image = profile.photos?.[0]?.value || '';
                }
                await existingByEmail.save();
                return done(null, existingByEmail);
              }
            }

            // Otherwise create new user
            user = await User.create({
              googleId: profile.id,
              firstName: profile.name?.givenName || '',
              lastName: profile.name?.familyName || '',
              email: email,
              image: profile.photos?.[0]?.value || '',
              role: 'user',
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn(
    'Google OAuth credentials not found. Google authentication will be disabled.'
  );
}

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
