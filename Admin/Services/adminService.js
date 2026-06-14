import userModel from '../../User/models/userModel.js';
import productModel from '../../User/models/productModel.js';
import bcrypt from 'bcrypt';
import orderModel from '../../User/models/orderModel.js';

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
    
    const revenueData = await orderModel.aggregate([
        { $match: { orderStatus: 'Delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    const recentOrders = await orderModel.find()
        .populate('userId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const salesStats = await orderModel.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo }, orderStatus: { $ne: 'Cancelled' } } },
        { $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalSales: { $sum: "$totalAmount" },
            count: { $sum: 1 }
        }},
        { $sort: { "_id": 1 } }
    ]);

    const topProducts = await orderModel.aggregate([
        { $unwind: "$items" },
        { $group: { _id: "$items.productId", totalSold: { $sum: "$items.quantity" } } },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: "$product" },
        { $project: { name: "$product.name", totalSold: 1 } }
    ]);

    const topCategories = await orderModel.aggregate([
        { $unwind: "$items" },
        { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'product' } },
        { $unwind: "$product" },
        { $group: { _id: "$product.categoryId", totalSold: { $sum: "$items.quantity" } } },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: "$category" },
        { $project: { name: "$category.name", totalSold: 1 } }
    ]);

    return { 
        customerCount, 
        productCount, 
        orderCount, 
        totalRevenue,
        recentOrders,
        salesStats,
        topProducts,
        topCategories,
        activePage: 'dashboard'
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

export default {
    adminLoginService,
    getDashboardDataService,
    getAdminProfileService,
    updateProfileService
};