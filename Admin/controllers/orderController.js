import { MESSAGES } from '../../utils/messages.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';
import orderModel from '../../User/models/orderModel.js';
import userModel from '../../User/models/userModel.js';

const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const search = req.query.search || '';
        const status = req.query.status || '';

        const query = {};
        if (search) {
            query.orderId = { $regex: search, $options: 'i' };
        }
        if (status) {
            query.orderStatus = status;
        }

        const matchStage = { $match: query };

        const pipeline = [
            matchStage,
            {
                $addFields: {
                    sortPriority: {
                        $cond: { if: { $eq: ['$orderStatus', 'Pending'] }, then: 0, else: 1 }
                    }
                }
            },
            { $sort: { sortPriority: 1, createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ];

        const orders = await orderModel.aggregate(pipeline);

        await orderModel.populate(orders, { path: 'userId', select: 'firstName lastName email' });

        const totalOrders = await orderModel.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        res.render('admin/orders', {
            orders,
            currentPage: page,
            totalPages,
            search,
            status
        });
    } catch (error) {
        console.error('Admin Get Orders Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const currentOrder = await orderModel.findById(id);
        if (!currentOrder) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Order not found' });
        }

        const updateData = {
            orderStatus: status,
            'items.$[elem].status': status
        };

        if (currentOrder.paymentMethod === 'COD' && status === 'Delivered') {
            updateData.paymentStatus = 'Paid';
        }

        const order = await orderModel.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                arrayFilters: [{ 'elem.status': { $ne: 'Cancelled' } }]
            }
        );

        if (!order) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        console.error('Admin Update Status Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await orderModel.findById(id)
            .populate('userId')
            .populate('items.productId')
            .populate('items.variantId');

        if (!order) {
            return res.redirect('/admin/orders');
        }

        res.render('admin/order-details', { order, activePage: 'orders' });
    } catch (error) {
        console.error('Admin Get Order Details Error:', error);
        res.redirect('/admin/orders');
    }
};

const rejectReturn = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim() === '') {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: 'Please provide a reason for rejection'
            });
        }

        const order = await orderModel.findById(id);
        if (!order) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.orderStatus !== 'Return Pending') {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: 'Order is not in Return Pending status'
            });
        }

        order.orderStatus = 'Delivered';
        order.returnReason = `Rejected: ${reason}`;
        await order.save();

        res.json({
            success: true,
            message: 'Return rejected successfully. User has been notified.'
        });
    } catch (error) {
        console.error('Admin Reject Return Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.SERVER_ERROR
        });
    }
};

export default {
    getOrders,
    updateOrderStatus,
    getOrderDetails,
    rejectReturn
};
