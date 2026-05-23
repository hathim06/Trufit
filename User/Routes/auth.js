import express from 'express';
const router = express.Router();
import passport from '../../Config/passport.js';

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', {
    failureRedirect: '/login'
}),
    (req, res) => {
        req.session.user = req.user._id;
        req.session.save((err) => {
            if (err) return res.redirect('/login');
            res.redirect('/');
        });
    }
);

export default router;