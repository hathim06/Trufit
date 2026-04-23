const express = require('express');
const router = express.Router();
const passport = require('../../Config/passport');

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

module.exports = router;