const userModel = require('../../User/models/userModel');
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

module.exports = {
    adminLoginService,
    getDashboardDataService,
    getAdminProfileService,
    updateProfileService
};