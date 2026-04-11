const express = require('express');
const router = express.Router();
const passport = require('passport');

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', {
    failureRedirect: '/users/login'
}),
    (req, res) => {
        req.session.user = req.user._id;
        res.redirect('/');
    }
);

module.exports = router;