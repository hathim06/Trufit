import { MESSAGES } from '../utils/messages.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import User from '../User/models/userModel.js';

const requestContext = async (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    if (req.session.user) {
        try {
            const user = await User.findById(req.session.user);
            if (!user || user.isBlocked) {
                const message = !user ? 'Account no longer exists' : MESSAGES.USER_BLOCKED;

                req.session.authMessage = message;
                delete req.session.user;

                if (!req.path.startsWith('/admin')) {
                    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
                        return res.status(STATUS_CODES.UNAUTHORIZED).json({
                            success: false,
                            message,
                            redirectUrl: '/login'
                        });
                    }
                    return res.redirect(`/login?message=${encodeURIComponent(message)}`);
                }
            } else {
                res.locals.user = req.session.user;
            }
        } catch (error) {
            console.error('Global Auth Check Error:', error);
            res.locals.user = req.session.user;
        }
    } else {
        res.locals.user = null;
    }

    res.locals.admin = req.session.admin || null;
    next();
};

export default requestContext;
