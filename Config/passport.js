const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userModel = require('../models/userModel');

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URI
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;

            let user = await userModel.findOne({ email });

            if (!user) {
                user = await userModel.create({
                    email,
                    firstName: profile.name.givenName,
                    lastName: profile.name.familyName,
                    isGoogleAuth: true
                });
            }

            return done(null, user);

        } catch (error) {
            return done(error, null);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await userModel.findById(id);
    done(null, user);
});

module.exports = passport;