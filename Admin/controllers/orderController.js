const orderService = require('../Services/orderService');

const getOrders = async (req, res) => {
    try {
        const orders = await orderService.getAllOrdersService();
        res.render('admin/orders', {
            orders,
            success: req.query.success,
            message: req.query.message
        });
    } catch (error) {
        res.redirect('/admin/dashboard');
    }
};

const changeOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await orderService.updateOrderStatusService(id, status);
        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

module.exports = {
    getOrders,
    changeOrderStatus
};
