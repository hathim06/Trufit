const orderModel = require('../../User/models/orderModel');

const getAllOrdersService = async () => {
    return await orderModel.find()
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 });
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
