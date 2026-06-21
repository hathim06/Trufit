import dotenv from 'dotenv';
dotenv.config();
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import userModel from '../User/models/userModel.js';

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
                    firstName: profile.name.givenName || profile.displayName || 'User',
                    lastName: profile.name.familyName || ' ',
                    isGoogleAuth: true,
                    isVerified: false
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

export default passport;
