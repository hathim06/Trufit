const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/auth',
    '/public',
    '/verify-otp',
    '/resend-otp',
    '/forgot-password',
    '/reset-password'
];

const isPublicPath = (path) => {
    return publicPaths.includes(path)
        || path.startsWith('/admin')
        || path.startsWith('/public')
        || path.startsWith('/auth')
        || path.startsWith('/watch-assets');
};

const requireUserSession = (req, res, next) => {
    if (isPublicPath(req.path)) {
        return next();
    }

    if (!req.session.user) {
        return res.redirect('/login');
    }

    next();
};

export default requireUserSession;
