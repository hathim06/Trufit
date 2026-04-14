const isAdmin = (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    if (req.session.admin) {
        next()
    } else {
        res.redirect('/admin/login');
    }
}

const isLoggedOut = (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    if (!req.session.admin) {
        next()
    } else {
        res.redirect('/admin/dashboard');
    }
}

module.exports = { isAdmin, isLoggedOut };