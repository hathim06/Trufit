import { MESSAGES } from '../../utils/messages.js';
import userService from '../Services/userService.js';

const getUsers = async (req, res) => {
    try {
        const data = await userService.getUsersService(req.query);

        res.render('admin/users', {
            ...data,
            success: req.query.success,
            message: req.query.message,
        });

    } catch (error) {
        console.error("Error in getUsers:", error);
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

const softDeleteUser = async (req, res) => {
    try {
        await userService.softDeleteUserService(req.params.id);
        res.json({ success: true, message: 'User soft deleted successfully' });
    } catch {
        res.json({ success: false });
    }
};

const restoreUser = async (req, res) => {
    try {
        await userService.restoreUserService(req.params.id);
        res.json({ success: true, message: 'User restored successfully' });
    } catch {
        res.json({ success: false });
    }
};

const hardDeleteUser = async (req, res) => {
    try {
        await userService.hardDeleteUserService(req.params.id);
        res.json({ success: true, message: MESSAGES.USER_DELETED });
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

export default {
    getUsers,
    blockUser,
    unblockUser,
    softDeleteUser,
    restoreUser,
    hardDeleteUser,
    viewUser
};
