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

const recalculateOrderTotals = (order) => {
    const activeItems = (order.items || []).filter(item => !['Cancelled', 'Returned'].includes(item.status));
    const activeSubtotal = activeItems.reduce((sum, item) => sum + getItemTotal(item), 0);
    const originalSubtotal = Number(order.subtotal) || 0;
    const originalDiscount = Number(order.discountAmount) || 0;
    const activeDiscount = originalSubtotal > 0 && originalDiscount > 0
        ? Math.max(0, Math.round((activeSubtotal / originalSubtotal) * originalDiscount))
        : 0;

    order.subtotal = activeSubtotal;
    order.discountAmount = activeDiscount;
    order.totalAmount = Math.max(0, activeSubtotal - activeDiscount);
    return order;
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
    const statuses = order.items.map(i => i.status);
    const activeStatuses = statuses.filter(s => s !== 'Cancelled' && s !== 'Returned');

    if (statuses.length > 0 && statuses.every(s => s === 'Cancelled')) {
        order.orderStatus = 'Cancelled';
    } else if (statuses.some(s => s === 'Return Pending')) {
        order.orderStatus = 'Return Pending';
    } else if (statuses.length > 0 && statuses.every(s => ['Returned', 'Cancelled'].includes(s)) && statuses.some(s => s === 'Returned')) {
        order.orderStatus = 'Returned';
    } else if (activeStatuses.length > 0) {
        if (activeStatuses.every(s => s === 'Delivered')) {
            order.orderStatus = 'Delivered';
        } else if (activeStatuses.every(s => ['Out for Delivery', 'Delivered'].includes(s))) {
            order.orderStatus = 'Out for Delivery';
        } else if (activeStatuses.every(s => ['Shipped', 'Out for Delivery', 'Delivered'].includes(s))) {
            order.orderStatus = 'Shipped';
        } else if (activeStatuses.every(s => ['Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'].includes(s))) {
            order.orderStatus = 'Confirmed';
        } else {
            order.orderStatus = 'Pending';
        }
    }
};

const hasPendingReturn = (order) => order.items.some(item => item.status === 'Return Pending');

const FAILED_ORDER_RETRY_DAYS = 3;
const FAILED_ORDER_RETRY_MS = FAILED_ORDER_RETRY_DAYS * 24 * 60 * 60 * 1000;

const cleanupExpiredFailedOrders = async () => {
    const retryCutoff = new Date(Date.now() - FAILED_ORDER_RETRY_MS);
    const query = {
        paymentMethod: 'Online',
        paymentStatus: 'Failed',
        $or: [
            { failedPaymentExpiresAt: { $lte: new Date() } },
            { failedPaymentExpiresAt: null, createdAt: { $lte: retryCutoff } }
        ]
    };
    const expiredOrders = await orderModel.find(query);
    for (const order of expiredOrders) {
        for (const item of order.items) {
            if (item.variantId && item.status !== 'Cancelled') {
                await variantModel.findByIdAndUpdate(item.variantId, {
                    $inc: { quantity: item.quantity }
                });
            }
        }
        await orderModel.findByIdAndDelete(order._id);
    }
};

const visibleOrderFilter = () => {
    const retryCutoff = new Date(Date.now() - FAILED_ORDER_RETRY_MS);
    return {
        $or: [
            { paymentMethod: { $ne: 'Online' } },
            { paymentStatus: { $ne: 'Failed' } },
            { failedPaymentExpiresAt: { $gt: new Date() } },
            { failedPaymentExpiresAt: null, createdAt: { $gt: retryCutoff } }
        ]
    };
};

const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const search = req.query.search || '';
        const statusParam = req.query.status || '';
        const status = { Placed: 'Pending', Processing: 'Confirmed' }[statusParam] || statusParam;
        const sort = req.query.sort || 'newest';

        const sortOptions = {
            newest: { createdAt: -1 },
            oldest: { createdAt: 1 },
            amountHigh: { totalAmount: -1 },
            amountLow: { totalAmount: 1 },
            statusNewest: { orderStatus: 1, createdAt: -1 }
        };

        await orderModel.updateMany(
            {
                orderStatus: { $nin: ['Return Pending', 'Returned', 'Cancelled'] },
                'items.status': 'Return Pending'
            },
            { $set: { orderStatus: 'Return Pending' } }
        );

        await cleanupExpiredFailedOrders();

        const query = { $and: [visibleOrderFilter()] };
        if (search) {
            query.$and.push({ orderId: { $regex: search, $options: 'i' } });
        }
        if (status === 'Payment Failed') {
            query.$and.push({
                paymentMethod: 'Online',
                paymentStatus: 'Failed',
                $or: [
                    { failedPaymentExpiresAt: { $gt: new Date() } },
                    { failedPaymentExpiresAt: null, createdAt: { $gt: new Date(Date.now() - FAILED_ORDER_RETRY_MS) } }
                ]
            });
        } else if (status === 'Return Pending') {
            query.$and.push({
                $or: [
                    { orderStatus: 'Return Pending' },
                    { 'items.status': 'Return Pending' }
                ]
            });
        } else if (status) {
            const statusQuery = { orderStatus: status };
            if (status === 'Pending') statusQuery.paymentStatus = { $ne: 'Failed' };
            query.$and.push(statusQuery);
        }

        const totalOrders = await orderModel.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await orderModel.find(query)
            .populate('userId', 'firstName lastName email')
            .populate('items.productId', 'price offerPrice')
            .populate('items.variantId', 'price')
            .sort(sortOptions[sort] || sortOptions.newest)
            .skip(skip)
            .limit(limit);

        // const orders = await orderModel.aggregate([
        //     { $match: query },
        //     {
        //         $addFields: {
        //             statusPriority: {
        //                 $cond: [
        //                     { $eq: ['$orderStatus', 'Cancelled'] }, 0, 1
        //                 ]
        //             }
        //         }
        //     },
        //     { $sort: { statusPriority: 1, createdAt: -1 } },
        //     { $skip: skip },
        //     { $limit: limit },
        // ])

        res.render('admin/orders', {
            orders,
            currentPage: page,
            totalPages,
            search,
            status,
            sort,
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
                recalculateOrderTotals(currentOrder);
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

        if (status === 'Delivered') {
            const deliveredAt = new Date();
            updateData.deliveredAt = deliveredAt;
            updateData['items.$[elem].deliveredAt'] = deliveredAt;
        }

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
            const affectedItems = order.items.filter(item => !alreadyCancelledIds.has(item._id.toString()));
            const refundAmount = affectedItems.reduce((sum, item) => sum + getItemRefundTotal(item, order), 0);
            for (const item of affectedItems) {
                if (item.variantId) {
                    await variantModel.findByIdAndUpdate(item.variantId, {
                        $inc: { quantity: item.quantity }
                    });
                }
            }
            recalculateOrderTotals(order);
            if (order.paymentStatus === 'Paid') {
                await refundToWallet(
                    order.userId,
                    refundAmount || getOrderTotal(order),
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


const updateOrderItemStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { itemId, status } = req.body;
        const allowedStatuses = ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];

        if (!itemId || !allowedStatuses.includes(status)) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Invalid item status update' });
        }

        const order = await orderModel.findById(id);
        if (!order) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Order not found' });
        }

        const item = order.items.find(i => i._id.toString() === itemId.toString());
        if (!item) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Item not found in order' });
        }

        if (['Cancelled', 'Returned'].includes(item.status)) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: `Item is already ${item.status.toLowerCase()}` });
        }

        if (status === 'Cancelled') {
            if (item.variantId) {
                await variantModel.findByIdAndUpdate(item.variantId, { $inc: { quantity: item.quantity } });
            }

            const itemTotal = getItemTotal(item);
            const refundTotal = Math.max(0, itemTotal - getDiscountShare(order, itemTotal));
            order.subtotal = Math.max(0, Number(order.subtotal || 0) - itemTotal);
            order.totalAmount = Math.max(0, Number(order.totalAmount || 0) - refundTotal);

            if (order.paymentStatus === 'Paid') {
                await refundToWallet(order.userId, refundTotal, `Refund for cancelled item in order ${order.orderId}`);
            }
        }

        item.status = status;
        if (status === 'Delivered') {
            item.deliveredAt = item.deliveredAt || new Date();
        }
        if (status === 'Delivered' && order.paymentMethod === 'COD' && order.items.every(i => i._id.toString() === itemId.toString() || i.status === 'Delivered' || i.status === 'Cancelled')) {
            order.paymentStatus = 'Paid';
        }

        syncOrderStatusFromItems(order);
        if (order.orderStatus === 'Delivered' && !order.deliveredAt) {
            order.deliveredAt = new Date();
        }
        if (order.items.every(i => ['Cancelled', 'Returned'].includes(i.status)) && order.paymentStatus === 'Paid') {
            order.paymentStatus = 'Refunded';
        }

        await order.save();
        res.json({ success: true, message: 'Item status updated successfully', orderStatus: order.orderStatus });
    } catch (error) {
        console.error('Admin Update Item Status Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR });
    }
};
const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        await cleanupExpiredFailedOrders();
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
            const refundCandidates = pendingReturnItems.length > 0 ? pendingReturnItems : order.items.filter(item => item.status !== 'Cancelled');
            const refundAmount = refundCandidates.length > 0
                ? (await Promise.all(refundCandidates.map(item => getItemRefundTotal(item, order))))
                    .reduce((sum, amount) => sum + amount, 0)
                : getOrderTotal(order);

            order.returnStatus = 'Approved';
            if (pendingReturnItems.length > 0) {
                pendingReturnItems.forEach(item => {
                    item.status = 'Returned';
                });
                recalculateOrderTotals(order);
                syncOrderStatusFromItems(order);
            } else {
                order.orderStatus = 'Returned';
                order.items.forEach(item => {
                    if (item.status !== 'Cancelled') {
                        item.status = 'Returned';
                    }
                });
            }

            for (const item of refundCandidates) {
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
    updateOrderItemStatus,
    getOrderDetails,
    cancelOrderItem,
    rejectReturn,
    verifyReturnRequest
};



