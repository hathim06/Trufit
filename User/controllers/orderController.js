import mongoose from 'mongoose';
import { MESSAGES } from '../../utils/messages.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';
import orderService from '../Services/orderService.js';
import cartModel from '../models/cartModel.js';
import addressModel from '../models/addressModel.js';
import orderModel from '../models/orderModel.js';

const loadCheckout = async (req, res) => {
    try {
        const userId = req.session.user;

        const cart = await cartModel.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: { path: 'categoryId', select: 'isListed name' }
            })
            .populate('items.variantId');

        if (!cart || cart.items.length === 0) {
            return res.redirect('/cart');
        }

        const invalidItems = cart.items.filter(item => {
            const product = item.productId;
            if (!product) return true;
            if (product.isDeleted) return true;
            if (!product.status || product.status.toLowerCase() !== 'active') return true;
            if (product.categoryId && !product.categoryId.isListed) return true;
            return false;
        });

        if (invalidItems.length > 0) {
            const names = invalidItems
                .map(i => i.productId?.name || 'Unknown product')
                .join(', ');
            return res.redirect(
                '/cart?error=' + encodeURIComponent(`Some items in your cart are no longer available: ${names}. Please remove them before checkout.`)
            );
        }

        const addresses = await addressModel.find({ userId });

        let subtotal = 0;
        cart.items.forEach(item => {
            const price = item.variantId ? item.variantId.price : item.productId.price;
            subtotal += price * item.quantity;
        });

        const discountAmount = 0;
        const total = subtotal;

        res.render('users/checkout', {
            cartItems: cart.items,
            addresses,
            subtotal,
            discountAmount,
            total,
            appliedCoupon: null
        });
    } catch (error) {
        console.error('Load Checkout Error:', error);
        res.redirect('/cart?error=' + encodeURIComponent('Failed to load checkout page'));
    }
};

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressId, paymentMethod } = req.body;

        if (!addressId || !paymentMethod) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.ADDRESS_PAYMENT_REQUIRED });
        }

        const order = await orderService.createOrder(userId, addressId, paymentMethod);

        res.json({
            success: true,
            message: MESSAGES.ORDER_PLACED,
            redirectUrl: `/order-success/${order._id}`
        });
    } catch (error) {
        console.error('Place Order Error:', error);
        res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: error.message,
            redirectUrl: `/order-failed?message=${encodeURIComponent(error.message)}`
        });
    }
};

const loadOrderSuccess = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await orderModel.findById(orderId);
        if (!order || order.userId.toString() !== req.session.user.toString()) {
            return res.redirect('/');
        }
        res.render('users/order-success', { order });
    } catch (error) {
        res.redirect('/');
    }
};

const loadOrderFailed = (req, res) => {
    res.render('users/order-failed', { message: req.query.message });
};

const loadOrders = async (req, res) => {
    try {
        const userId = req.session.user;

        // const matchStage = { $match: { userId: new mongoose.Types.ObjectId(userId) } };
        // const pipeLine = [
        //     matchStage,
        //     {
        //         $addFields: {
        //             sortPriority: {
        //                 $cond: { if: { $eq: ["$orderStatus", "Cancelled"] }, then: 0, else: 1 }
        //             }
        //         }
        //     },
        //     { $sort: { sortPriority: 1, createdAt: -1 } },
        // ];

        // const orders = await orderModel.aggregate(pipeLine);
        // await orderModel.populate(orders, [
        //     { path: 'items.productId' },
        //     { path: 'items.variantId' }
        // ]);

        const orders = await orderModel.find({ userId })
            .sort({ createdAt: -1 })
            .populate('items.productId')
            .populate('items.variantId');

        res.render('users/orders', { orders });
    } catch (error) {
        console.error('Load Orders Error:', error);
        res.redirect('/');
    }
};

const loadOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await orderModel.findById(orderId)
            .populate('items.productId')
            .populate('items.variantId');

        if (!order || order.userId.toString() !== req.session.user.toString()) {
            return res.redirect('/profile/orders');
        }

        res.render('users/order-details', { order });
    } catch (error) {
        console.error('Load Order Details Error:', error);
        res.redirect('/profile/orders');
    }
};

const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.user;
        await orderService.cancelOrder(orderId, userId);
        res.json({ success: true, message: MESSAGES.ORDER_CANCELLED });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const cancelOrderItem = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { itemId, reason } = req.body;
        const userId = req.session.user;
        await orderService.cancelOrderItem(orderId, itemId, userId, reason);
        res.json({ success: true, message: "Product cancelled successfully" });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const returnOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.user;
        const { reason } = req.body;
        await orderService.returnOrder(orderId, userId, reason);
        res.json({ success: true, message: MESSAGES.ORDER_RETURNED });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const returnOrderItem = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.user;
        const { itemId, reason } = req.body;
        await orderService.returnOrderItem(orderId, itemId, userId, reason);
        res.json({ success: true, message: 'Return request submitted for this item.' });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await orderModel.findById(orderId)
            .populate('items.productId')
            .populate('items.variantId');

        if (!order || order.userId.toString() !== req.session.user.toString()) {
            return res.redirect('/profile/orders');
        }

        res.render('users/invoice', { order });
    } catch (error) {
        console.error('Download Invoice Error:', error);
        res.redirect('/profile/orders');
    }
}

export default {
    loadCheckout,
    placeOrder,
    loadOrderSuccess,
    loadOrderFailed,
    loadOrders,
    loadOrderDetails,
    cancelOrder,
    cancelOrderItem,
    returnOrder,
    returnOrderItem,
    downloadInvoice
};
