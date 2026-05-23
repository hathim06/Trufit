import User from '../models/userModel.js';

const isLoggedIn = async (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user);
            
            if (!user) {
                // If user is deleted, destroy session and redirect with specific message
                req.session.destroy();
                return res.redirect('/login?message=Account no longer exists');
            }

            if (user.isBlocked) {
                // If user is blocked, destroy session and redirect
                req.session.destroy();
                return res.redirect('/login?message=Your account has been blocked by admin');
            }
            
            return next();
        } else {
            return res.redirect('/login');
        }
    } catch (error) {
        console.error("Auth Middleware (isLoggedIn) Error:", error);
        res.redirect('/login');
    }
}

const isLoggedOut = (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    try {
        if (req.session.user) {
            return res.redirect('/');
        } else {
            return next();
        }
    } catch (error) {
        console.error("Auth Middleware (isLoggedOut) Error:", error);
        next();
    }
}

// isUser was redundant with the new isLoggedIn, keeping it for backward compatibility if needed, 
// but it now uses the same secure check.
const isUser = async (req, res, next) => {
    return isLoggedIn(req, res, next);
};

export default {
    isLoggedIn,
    isLoggedOut,
    isUser
}