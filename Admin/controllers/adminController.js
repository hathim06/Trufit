const adminService = require('../Services/adminService');

const showLogin = async (req, res) => {
    res.render('admin/login', { success: req.query.success, message: req.query.message });
};

const login = async (req, res) => {
    try {
        const admin = await adminService.adminLoginService(req.body.email, req.body.password);

        req.session.admin = admin._id;

        req.session.save((err) => {
            if (err) {
                return res.redirect('/admin/login?message=Session error');
            }
            res.redirect('/admin/dashboard');
        });

    } catch (error) {
        res.redirect('/admin/login?message=' + encodeURIComponent(error.message));
    }
};

const logout = async (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
};

const dashboard = async (req, res) => {
    try {
        const data = await adminService.getDashboardDataService();
        res.render('admin/dashboard', data);
    } catch (error) {
        res.redirect('/admin/login');
    }
};

const showProfile = async (req, res) => {
    try {
        const admin = await adminService.getAdminProfileService(req.session.admin);

        res.render('admin/profile', {
            admin,
            message: req.query.message,
            success: req.query.success
        });

    } catch (error) {
        res.redirect('/admin/dashboard');
    }
};

const updateProfile = async (req, res) => {
    try {
        await adminService.updateProfileService(req.session.admin, req.body);

        res.redirect('/admin/profile?success=Profile updated successfully');

    } catch (error) {
        res.redirect('/admin/profile?message=' + encodeURIComponent(error.message));
    }
};

module.exports = {
    showLogin,
    login,
    logout,
    dashboard,
    showProfile,
    updateProfile
};