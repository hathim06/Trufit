const orderModel = require('../../User/models/orderModel');

const getAllOrdersService = async (queryParams) => {
    const search = queryParams.search || "";
    const status = queryParams.status || "";
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 5;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.orderStatus = status;
    if (search) {
        query.orderId = { $regex: search, $options: "i" };
    }

    const totalOrders = await orderModel.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await orderModel.find(query)
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return {
        orders,
        search,
        status,
        currentPage: page,
        totalPages,
        totalOrders,
        limit
    };
};

const updateOrderStatusService = async (orderId, status) => {
    const order = await orderModel.findById(orderId);
    if (!order) throw new Error("Order not found");
    
    order.orderStatus = status;
    order.updatedAt = new Date();
    return await order.save();
};

module.exports = {
    getAllOrdersService,
    updateOrderStatusService
};
