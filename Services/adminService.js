const adminModel = require('../models/userModel');
const bcrypt = require('bcrypt');

const adminLoginService = async (email, password) => {
    try {
        const admin = await adminModel.findOne({ email });
        if (!admin) {
            return { success: false, message: 'Admin not found' };
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return { success: false, message: 'Invalid password' };
        }
        return { success: true, message: 'Admin login successful' };
    } catch (error) {
        console.log(error);
        return { success: false, message: 'An error occurred during login' };
    }
}

const adminLogoutService = async (req, res) => {
    try {
        req.session.destroy();
        return { success: true, message: 'Admin logout successful' };
    } catch (error) {
        console.log(error);
        return { success: false, message: 'An error occurred during logout' };
    }
}

const getAllUsersService = async () => {
    try {
        const users = await adminModel.find();
        return { success: true, users };
    } catch (error) {
        console.log(error);
        return { success: false, message: 'An error occurred while fetching users' };
    }
}

const getUserByIdService = async (userId) => {
    try {
        const user = await adminModel.findById(userId);
        return { success: true, user };
    } catch (error) {
        console.log(error);
        return { success: false, message: 'An error occurred while fetching user' };
    }
}

const blockUserService = async (userId) => {
    try {
        const user = await adminModel.findById(userId);
        if (!user) {
            return { success: false, message: 'User not found' };
        }
        user.isBlocked = true;
        await user.save();
        return { success: true, message: 'User blocked successfully' };
    } catch (error) {
        console.log(error);
        return { success: false, message: 'An error occurred while blocking user' };
    }
}

const unblockUserService = async (userId) => {
    try {
        const user = await adminModel.findById(userId);
        if (!user) {
            return { success: false, message: 'User not found' };
        }
        user.isBlocked = false;
        await user.save();
        return { success: true, message: 'User unblocked successfully' };
    } catch (error) {
        console.log(error);
        return { success: false, message: 'An error occurred while unblocking user' };
    }
}

const editUserService = async (userId, data) => {
    try {
        const user = await adminModel.findById(userId);
        if (!user) {
            return { success: false, message: 'User not found' };
        }
        user.firstName = data.firstName;
        user.lastName = data.lastName;
        user.email = data.email;
        user.mobile = data.mobile;
        user.profilePicture = data.profilePicture;
        await user.save();
        return { success: true, message: 'User updated successfully' };
    } catch (error) {
        console.log(error);
        return { success: false, message: 'An error occurred while updating user' };
    }
}

const deleteUserService = async (userId) => {
    try {
        const user = await adminModel.findById(userId);
        if (!user) {
            return { success: false, message: 'User not found' };
        }
        await user.deleteOne();
        return { success: true, message: 'User deleted successfully' };
    } catch (error) {
        console.log(error);
        return { success: false, message: 'An error occurred while deleting user' };
    }
}

const addUserService = async (userData) => {
    try {
        const { firstName, lastName, email, mobile, password } = userData;

        const existingUser = await adminModel.findOne({ email });
        if (existingUser) {
            return { success: false, message: 'User already exists' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new adminModel({
            firstName,
            lastName,
            email,
            mobile,
            password: hashedPassword,
            isAdmin: false,
            isBlocked: false
        });

        await newUser.save();
        return { success: true, message: 'User created successfully' };
    } catch (error) {
        console.log(error);
        return { success: false, message: 'An error occurred while adding user' };
    }
}

module.exports = {
    adminLoginService,
    adminLogoutService,
    getAllUsersService,
    getUserByIdService,
    blockUserService,
    unblockUserService,
    editUserService,
    deleteUserService,
    addUserService
};