const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const adminService = require('../Services/adminService');

const showLogin = async (req, res) => {
    try {
        res.render('admin/login', { success: req.query.success, message: req.query.message });
    } catch (error) {
        console.log(error);
        res.redirect('/admin/login');
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await User.findOne({ email, isAdmin: true });
        if (!admin) {
            return res.redirect('/admin/login?message=Invalid email or you do not have admin access');
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.redirect('/admin/login?message=Invalid password');
        }

        req.session.admin = admin._id;
        return res.redirect('/admin/dashboard');
    } catch (error) {
        console.error("Admin Login Error:", error);
        res.redirect('/admin/login?message=An error occurred during login');
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/admin/login');
    } catch (error) {
        console.log(error);
        res.redirect('/admin/login');
    }
}

const dashboard = async (req, res) => {
    try {
        res.render('admin/dashboard');
    } catch (error) {
        console.log(error);
        res.redirect('/admin/login');
    }
}

const getUsers = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 1;
        const skip = (page - 1) * limit;

        const query = {
            isAdmin: false,
            $or: [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ]
        };

        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render('admin/users', {
            users,
            search,
            currentPage: page,
            totalPages,
            totalUsers,
            limit,
            success: req.query.success,
            message: req.query.message
        });

    } catch (error) {
        console.log(error);
        res.redirect('/admin/login');
    }
}

const blockUser = async (req, res) => {
    try {
        await adminService.blockUserService(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.log(error);
        res.json({ success: false });
    }
}

const unblockUser = async (req, res) => {
    try {
        await adminService.unblockUserService(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.log(error);
        res.json({ success: false });
    }
}

const deleteUser = async (req, res) => {
    try {
        const result = await adminService.deleteUserService(req.params.id);
        if (result.success) {
            res.json({ success: true, message: "User account has been permanently deleted." });
        } else {
            res.json({ success: false, message: result.message || "Failed to delete user." });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false });
    }
}

const loadAddUser = async (req, res) => {
    try {
        res.render('admin/add-user', { message: req.query.message });
    } catch (error) {
        console.log(error);
        res.redirect('/admin/users');
    }
}

const addUser = async (req, res) => {
    try {
        const result = await adminService.addUserService(req.body);
        if (result.success) {
            res.redirect('/admin/users?success=User added successfully');
        } else {
            res.redirect(`/admin/users/add?message=${result.message}`);
        }
    } catch (error) {
        console.log(error);
        res.redirect('/admin/users/add?message=Something went wrong');
    }
}

const loadEditUser = async (req, res) => {
    try {
        const result = await adminService.getUserByIdService(req.params.id);
        if (result.success) {
            res.render('admin/edit-user', { user: result.user, message: req.query.message });
        } else {
            res.redirect('/admin/users?message=User not found');
        }
    } catch (error) {
        console.log(error);
        res.redirect('/admin/users');
    }
}

const updateUser = async (req, res) => {
    try {
        const result = await adminService.editUserService(req.params.id, req.body);
        if (result.success) {
            res.redirect('/admin/users?success=User updated successfully');
        } else {
            res.redirect(`/admin/users/edit/${req.params.id}?message=${result.message}`);
        }
    } catch (error) {
        console.log(error);
        res.redirect('/admin/users');
    }
}

module.exports = {
    login,
    logout,
    dashboard,
    getUsers,
    showLogin,
    blockUser,
    unblockUser,
    deleteUser,
    loadAddUser,
    addUser,
    loadEditUser,
    updateUser
}