const userModel = require('../../User/models/userModel');
const orderModel = require('../../User/models/orderModel');
const productModel = require('../../User/models/productModel');
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
    const productCount = await productModel.countDocuments({ isDeleted: false });
    const orderCount = await orderModel.countDocuments();
    
    // Calculate total revenue from delivered orders
    const deliveredOrders = await orderModel.find({ orderStatus: 'Delivered' });
    const totalRevenue = deliveredOrders.reduce((sum, order) => sum + (order.grandTotal || 0), 0);

    const recentOrders = await orderModel.find()
        .populate('userId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5);

    return { 
        customerCount, 
        productCount, 
        orderCount, 
        totalRevenue,
        recentOrders
    };
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