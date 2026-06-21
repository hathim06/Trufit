import { MESSAGES } from '../../utils/messages.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';
import orderModel from '../../User/models/orderModel.js';
import userModel from '../../User/models/userModel.js';
import variantModel from '../../User/models/variants.js';
import productModel from '../../User/models/productModel.js';

const getItemUnitPrice = (item) => {
    return Number(item.price)
        || Number(item.productId?.offerPrice)
        || Number(item.variantId?.price)
        || Number(item.productId?.price)
        || 0;
};

const getItemTotal = (item) => getItemUnitPrice(item) * (Number(item.quantity) || 0);

const getDiscountShare = (order, itemTotal) => {
    const subtotal = Number(order.subtotal) || 0;
    const discountAmount = Number(order.discountAmount) || 0;
    if (subtotal <= 0 || discountAmount <= 0) return 0;
    return Math.min(itemTotal, Math.round((itemTotal / subtotal) * discountAmount));
};

const getItemRefundTotal = async (item, order = null) => {
    const embeddedTotal = getItemTotal(item);
    if (embeddedTotal > 0) {
        return order ? Math.max(0, embeddedTotal - getDiscountShare(order, embeddedTotal)) : embeddedTotal;
    }

    if (item.variantId) {
        const product = item.productId ? await productModel.findById(item.productId).select('offerPrice price') : null;
        const productPrice = Number(product?.offerPrice) || Number(product?.price) || 0;
        if (productPrice > 0) {
            const productTotal = productPrice * (Number(item.quantity) || 0);
            return order ? Math.max(0, productTotal - getDiscountShare(order, productTotal)) : productTotal;
        }

        const variant = await variantModel.findById(item.variantId).select('price');
        const variantTotal = (Number(variant?.price) || 0) * (Number(item.quantity) || 0);
        if (variantTotal > 0) {
            return order ? Math.max(0, variantTotal - getDiscountShare(order, variantTotal)) : variantTotal;
        }
    }

    return 0;
};

const getOrderTotal = (order) => {
    const itemTotal = order.items.reduce((sum, item) => sum + getItemTotal(item), 0);
    const subtotalTotal = Math.max(0, (Number(order.subtotal) || 0) - (Number(order.discountAmount) || 0));
    const storedTotal = Number(order.totalAmount) || 0;
    return subtotalTotal || storedTotal || itemTotal;
};

const refundToWallet = async (userId, amount, description) => {
    if (amount <= 0) return;

    const user = await userModel.findById(userId);
    if (!user) return;

    user.walletBalance += amount;
    user.walletTransactions.push({
        type: 'Credit',
        amount,
        description
    });
    await user.save();
};

const syncOrderStatusFromItems = (order) => {
    if (order.items.length && order.items.every(item => item.status === 'Cancelled')) {
        order.orderStatus = 'Cancelled';
    } else if (order.items.some(item => item.status === 'Return Pending')) {
        order.orderStatus = 'Return Pending';
    } else if (order.items.length && order.items.every(item => ['Returned', 'Cancelled'].includes(item.status))) {
        order.orderStatus = 'Returned';
    } else if (order.items.some(item => item.status === 'Returned')) {
        order.orderStatus = 'Delivered';
    } else if (order.items.length && order.items.every(item => item.status === 'Delivered')) {
        order.orderStatus = 'Delivered';
    }
};

const hasPendingReturn = (order) => order.items.some(item => item.status === 'Return Pending');

const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const search = req.query.search || '';
        const status = req.query.status || '';

        await orderModel.updateMany(
            {
                orderStatus: { $nin: ['Return Pending', 'Returned', 'Cancelled'] },
                'items.status': 'Return Pending'
            },
            { $set: { orderStatus: 'Return Pending' } }
        );

        const query = {};
        if (search) {
            query.orderId = { $regex: search, $options: 'i' };
        }
        if (status === 'Return Pending') {
            query.$or = [
                { orderStatus: 'Return Pending' },
                { 'items.status': 'Return Pending' }
            ];
        } else if (status) {
            query.orderStatus = status;
        }

        const totalOrders = await orderModel.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await orderModel.find(query)
            .populate('userId', 'firstName lastName email')
            .populate('items.productId', 'price offerPrice')
            .populate('items.variantId', 'price')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render('admin/orders', {
            orders,
            currentPage: page,
            totalPages,
            search,
            status,
            activePage: 'orders'
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
        const alreadyCancelledIds = new Set(
            currentOrder.items
                .filter(i => i.status === 'Cancelled')
                .map(i => i._id.toString())
        );

        const isReturnDecision = (currentOrder.orderStatus === 'Return Pending' || hasPendingReturn(currentOrder)) && ['Returned', 'Delivered'].includes(status);
        if (isReturnDecision) {
            const pendingReturnItems = currentOrder.items.filter(item => item.status === 'Return Pending');
            if (pendingReturnItems.length === 0) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'No return request is pending for this order' });
            }

            if (status === 'Returned') {
                let refundAmount = 0;
                for (const item of pendingReturnItems) {
                    item.status = 'Returned';
                    refundAmount += await getItemRefundTotal(item, currentOrder);

                    if (item.variantId) {
                        await variantModel.findByIdAndUpdate(item.variantId, {
                            $inc: { quantity: item.quantity }
                        });
                    }
                }
                refundAmount = refundAmount || getOrderTotal(currentOrder);

                if (currentOrder.paymentStatus === 'Paid') {
                    await refundToWallet(
                        currentOrder.userId,
                        refundAmount,
                        `Refund for returned item(s) in order ${currentOrder.orderId}`
                    );
                    if (currentOrder.items.every(item => ['Returned', 'Cancelled'].includes(item.status))) {
                        currentOrder.paymentStatus = 'Refunded';
                    }
                }
            } else {
                for (const item of pendingReturnItems) {
                    item.status = 'Delivered';
                }
                currentOrder.returnReason = currentOrder.returnReason ? `Rejected: ${currentOrder.returnReason}` : 'Rejected by admin';
            }

            syncOrderStatusFromItems(currentOrder);
            await currentOrder.save();
            return res.json({ success: true, message: status === 'Returned' ? 'Return approved successfully' : 'Return rejected successfully' });
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

        if (status === 'Cancelled' || status === 'Returned') {
            for (const item of order.items) {
                if (!alreadyCancelledIds.has(item._id.toString())) {
                    if (item.variantId) {
                        await variantModel.findByIdAndUpdate(item.variantId, {
                            $inc: { quantity: item.quantity }
                        });
                    }
                }
            }
            if (order.paymentStatus === 'Paid') {
                await refundToWallet(
                    order.userId,
                    getOrderTotal(order),
                    `Refund for admin cancelled/returned order ${order.orderId}`
                );
                order.paymentStatus = 'Refunded';
                await order.save();
            }
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

const cancelOrderItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { itemId } = req.body;

        const order = await orderModel.findById(id);

        if (!order) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Order not found' });
        }

        const item = order.items.find(i => i._id.toString() === itemId.toString());
        if (!item) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Item not found in order' });
        }

        if (item.status === 'Cancelled') {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Item is already cancelled' });
        }

        if (item.variantId) {
            await variantModel.findByIdAndUpdate(item.variantId, {
                $inc: { quantity: item.quantity }
            });
        }

        item.status = 'Cancelled';

        const itemTotal = item.price * item.quantity;
        const refundTotal = Math.max(0, itemTotal - getDiscountShare(order, itemTotal));
        order.subtotal = Math.max(0, order.subtotal - itemTotal);
        order.totalAmount = Math.max(0, order.totalAmount - refundTotal);

        const allCancelled = order.items.every(i => i.status === 'Cancelled');
        if (allCancelled) {
            order.orderStatus = 'Cancelled';
        }

        if (order.paymentStatus === 'Paid') {
            await refundToWallet(
                order.userId,
                refundTotal,
                `Refund for admin cancelled item in order ${order.orderId}`
            );
            if (allCancelled) {
                order.paymentStatus = 'Refunded';
            }
        }

        await order.save();

        res.json({ success: true, message: 'Item cancelled and stock restored successfully' });
    } catch (error) {
        console.error('Admin Cancel Item Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR });
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

const verifyReturnRequest = async (req, res) => {
    try {
        const { orderId, action } = req.body;
        const order = await orderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'order not found' });
        }

        if (action === 'Approve') {
            const pendingReturnItems = order.items.filter(item => item.status === 'Return Pending');
            const refundAmount = pendingReturnItems.length > 0
                ? (await Promise.all(pendingReturnItems.map(item => getItemRefundTotal(item, order))))
                    .reduce((sum, amount) => sum + amount, 0)
                : getOrderTotal(order);

            order.returnStatus = 'Approved';
            if (pendingReturnItems.length > 0) {
                pendingReturnItems.forEach(item => {
                    item.status = 'Returned';
                });
                syncOrderStatusFromItems(order);
            } else {
                order.orderStatus = 'Returned';
                order.items.forEach(item => {
                    if (item.status !== 'Cancelled') {
                        item.status = 'Returned';
                    }
                });
            }

            for (const item of pendingReturnItems.length > 0 ? pendingReturnItems : order.items) {
                if (item.variantId && item.status === 'Returned') {
                    await variantModel.findByIdAndUpdate(item.variantId, {
                        $inc: { quantity: item.quantity }
                    });
                }
            }

            if (order.paymentStatus === 'Paid') {
                await refundToWallet(
                    order.userId,
                    refundAmount,
                    `Refund for returned order ${order.orderId}`
                );
                order.paymentStatus = 'Refunded';
            }
        } else if (action === 'Reject') {
            order.returnStatus = 'Rejected';
            order.orderStatus = 'Delivered';
            order.items.forEach(item => {
                if (item.status === 'Return Pending') {
                    item.status = 'Delivered';
                }
            });
        }
        await order.save();
        res.json({ message: `Return ${action.toLowerCase()} by admin`, action });
    } catch (error) {
        console.error('Admin Return Verify Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR });
    }
}

export default {
    getOrders,
    updateOrderStatus,
    getOrderDetails,
    cancelOrderItem,
    rejectReturn,
    verifyReturnRequest
};
