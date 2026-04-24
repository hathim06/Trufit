const orderModel = require('../../User/models/orderModel');

const getAllOrdersService = async (queryParams) => {
    const search = queryParams.search || "";
    const status = queryParams.status || "";

    const query = {};
    if (status) query.orderStatus = status;
    if (search) {
        query.orderId = { $regex: search, $options: "i" };
    }

    const orders = await orderModel.find(query)
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 });

    return {
        orders,
        search,
        status
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
