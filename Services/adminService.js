const userModel = require('../models/userModel');
const addressModel = require('../models/addressModel');
const bcrypt = require('bcrypt');

const adminLoginService = async (email, password) => {
    const admin = await userModel.findOne({ email, isAdmin: true });

    if (!admin) {
        throw new Error('Invalid email or no admin access');
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
        throw new Error('Invalid password');
    }

    return admin;
};

const getDashboardDataService = async () => {
    const customerCount = await userModel.countDocuments({ isAdmin: false });
    return { customerCount };
};

const getUsersService = async (queryParams) => {
    const search = queryParams.search || "";
    const page = parseInt(queryParams.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const query = {
        isAdmin: false,
        $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
        ]
    };

    const totalUsers = await userModel.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    const users = await userModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return {
        users,
        search,
        currentPage: page,
        totalPages,
        totalUsers,
        limit
    };
};

const blockUserService = async (id) => {
    await userModel.findByIdAndUpdate(id, { isBlocked: true });
};

const unblockUserService = async (id) => {
    await userModel.findByIdAndUpdate(id, { isBlocked: false });
};

const deleteUserService = async (id) => {
    await userModel.findByIdAndDelete(id);
};

const getAdminProfileService = async (adminId) => {
    const admin = await userModel.findById(adminId);
    if (!admin) {
        throw new Error("Admin not found");
    }
    return admin;
}

const updateProfileService = async (adminId, body) => {
    const { email, currentPassword, newPassword } = body;
    const admin = await userModel.findById(adminId);
    if (!admin) {
        throw new Error("Admin not found");
    }
    if (email && email !== admin.email) {
        const existing = await userModel.findOne({ email })
        if (existing) {
            throw new Error("email already exist!!");
        }
        admin.email = email;
    }
    if (currentPassword && newPassword) {
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            throw new Error("Invalid current password");
        }
        admin.password = await bcrypt.hash(newPassword, 10);
    }
    await admin.save();
    return admin;
}

const getUserDetails = async (id) => {
    try {
        const user = await userModel.findById(id);
        if (!user) {
            throw new Error("User not found");
        }
        const addresses = await addressModel.find({ userId: id });
        return { user, addresses };
    }
    catch (error) {
        throw error;
    }
}

module.exports = {
    adminLoginService,
    getDashboardDataService,
    getUsersService,
    blockUserService,
    unblockUserService,
    deleteUserService,
    getAdminProfileService,
    updateProfileService,
    getUserDetails
};