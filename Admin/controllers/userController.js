const userService = require('../Services/userService');

const getUsers = async (req, res) => {
    try {
        const data = await userService.getUsersService(req.query);

        res.render('admin/users', {
            ...data,
            success: req.query.success,
            message: req.query.message
        });

    } catch (error) {
        res.redirect('/admin/login');
    }
};

const blockUser = async (req, res) => {
    try {
        await userService.blockUserService(req.params.id);
        res.json({ success: true });
    } catch {
        res.json({ success: false });
    }
};

const unblockUser = async (req, res) => {
    try {
        await userService.unblockUserService(req.params.id);
        res.json({ success: true });
    } catch {
        res.json({ success: false });
    }
};

const deleteUser = async (req, res) => {
    try {
        await userService.deleteUserService(req.params.id);
        res.json({ success: true, message: "User deleted successfully" });
    } catch {
        res.json({ success: false });
    }
};

const viewUser = async (req, res) => {
    try {
        const { user, addresses } = await userService.getUserDetails(req.params.id);
        res.render('admin/user-view', {
            user,
            addresses,
            success: req.query.success,
            message: req.query.message
        });
    } catch (error) {
        res.redirect('/admin/users');
    }
}

module.exports = {
    getUsers,
    blockUser,
    unblockUser,
    deleteUser,
    viewUser
};
