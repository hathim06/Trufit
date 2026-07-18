import { MESSAGES } from '../../utils/messages.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';
import orderService from '../Services/orderService.js';
import cartModel from '../models/cartModel.js';
import addressModel from '../models/addressModel.js';
import orderModel from '../models/orderModel.js';
import couponModel from '../models/couponModel.js';
import userModel from '../models/userModel.js';
import variantModel from '../models/variants.js';
import razorpay from '../../Config/razorpay.js';
import crypto from 'crypto';
import { attachEffectiveOffer, getEffectivePrice } from '../utils/offerPricing.js';

const FAILED_ORDER_RETRY_DAYS = 1;
const FAILED_ORDER_RETRY_MS = FAILED_ORDER_RETRY_DAYS * 24 * 60 * 60 * 1000;

const getFailedPaymentExpiry = () => new Date(Date.now() + FAILED_ORDER_RETRY_MS);

const canRetryFailedOrder = (order) => {
    if (!order || order.paymentMethod !== 'Online' || order.paymentStatus !== 'Failed') return false;
    const retryUntil = order.failedPaymentExpiresAt
        ? new Date(order.failedPaymentExpiresAt)
        : new Date(new Date(order.createdAt).getTime() + FAILED_ORDER_RETRY_MS);
    return new Date() <= retryUntil;
};

const cleanupExpiredFailedOrders = async (userId = null) => {
    const retryCutoff = new Date(Date.now() - FAILED_ORDER_RETRY_MS);
    const query = {
        paymentMethod: 'Online',
        paymentStatus: 'Failed',
        $or: [
            { failedPaymentExpiresAt: { $lte: new Date() } },
            { failedPaymentExpiresAt: null, createdAt: { $lte: retryCutoff } }
        ]
    };
    if (userId) query.userId = userId;

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

const visibleOrderQuery = (userId) => {
    const retryCutoff = new Date(Date.now() - FAILED_ORDER_RETRY_MS);
    return {
        userId,
        $or: [
            { paymentMethod: { $ne: 'Online' } },
            { paymentStatus: { $ne: 'Failed' } },
            { failedPaymentExpiresAt: { $gt: new Date() } },
            { failedPaymentExpiresAt: null, createdAt: { $gt: retryCutoff } }
        ]
    };
};

const buildVisibleOrdersQuery = (userId, status = '') => {
    const query = { $and: [visibleOrderQuery(userId)] };
    const retryCutoff = new Date(Date.now() - FAILED_ORDER_RETRY_MS);

    if (status === 'Payment Failed') {
        query.$and.push({
            paymentMethod: 'Online',
            paymentStatus: 'Failed',
            $or: [
                { failedPaymentExpiresAt: { $gt: new Date() } },
                { failedPaymentExpiresAt: null, createdAt: { $gt: retryCutoff } }
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
        query.$and.push({ orderStatus: status, paymentStatus: { $ne: 'Failed' } });
    }

    return query;
};

const getCleanReason = (reason, fallback = '') => {
    const cleanReason = typeof reason === 'string' ? reason.trim() : '';
    return cleanReason || fallback;
};

const markOrderPaymentFailed = async (orderId, userId = null) => {
    const query = {
        _id: orderId,
        paymentMethod: 'Online',
        paymentStatus: { $ne: 'Paid' }
    };
    if (userId) query.userId = userId;

    return orderModel.findOneAndUpdate(
        query,
        {
            paymentStatus: 'Failed',
            failedPaymentExpiresAt: getFailedPaymentExpiry()
        },
        { new: true }
    );
};

const getCouponUserUsageCount = (coupon, userId) => {
    const userIdText = userId.toString();
    if (coupon.usages && coupon.usages.length > 0) {
        return coupon.usages.filter(usage => usage.userId?.toString() === userIdText).length;
    }
    return coupon.usedBy.filter(id => id.toString() === userIdText).length;
};

const isCouponApplicable = (coupon, userId, subtotal) => {
    const maxUsage = Number(coupon.maxUsage) || 100;
    const perUserLimit = Number(coupon.perUserLimit) || 1;
    if (coupon.status !== 'Active') return false;
    if (new Date(coupon.startDate) > new Date()) return false;
    if (new Date(coupon.expiryDate) < new Date()) return false;
    if (Number(subtotal) < Number(coupon.minPurchase)) return false;
    if (Number(coupon.usageCount || 0) >= maxUsage) return false;
    return getCouponUserUsageCount(coupon, userId) < perUserLimit;
};

const calculateCouponDiscount = (coupon, subtotal) => {
    const normalizedSubtotal = Number(subtotal) || 0;
    const discountType = String(coupon.discountType || 'percentage').toLowerCase();
    const discountValue = Number(coupon.discountValue ?? coupon.discountPercentage ?? 0);

    if (discountType === 'flat') {
        return Math.max(0, Math.min(discountValue, normalizedSubtotal));
    }

    const percentageDiscount = Math.round(normalizedSubtotal * (discountValue / 100));
    const maxDiscount = Number(coupon.maxDiscountAmount) || percentageDiscount;
    return Math.min(percentageDiscount, maxDiscount);
};

const loadCheckout = async (req, res) => {
    try {
        const userId = req.session.user;

        const cart = await cartModel.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: [
                    { path: 'offerId' },
                    { path: 'categoryId', populate: { path: 'offerId' } }
                ]
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

        const itemsMissingVariant = [];
        for (const item of cart.items) {
            if (!item.variantId) {
                itemsMissingVariant.push(item);
            }
        }
        if (itemsMissingVariant.length > 0) {
            const names = itemsMissingVariant.map(i => i.productId?.name || 'Unknown product').join(', ');
            const missingIds = itemsMissingVariant.map(i => i._id.toString());
            cart.items = cart.items.filter(item => !missingIds.includes(item._id.toString()));
            await cart.save();
            return res.redirect('/cart?error=' + encodeURIComponent(`"${names}" was removed from your cart because no color variant was selected. Please add it again and choose a variant.`));
        }

        const addresses = await addressModel.find({ userId });

        let subtotal = 0;
        cart.items.forEach(item => {
            item.productId = attachEffectiveOffer(item.productId);
            const price = getEffectivePrice(item.productId, item.variantId);
            subtotal += price * item.quantity;
        });

        const coupons = await couponModel.find({
            status: 'Active',
            startDate: { $lte: new Date() },
            expiryDate: { $gte: new Date() },
            minPurchase: { $lte: subtotal }
        }).sort({ discountPercentage: -1 });
        const applicableCoupons = coupons.filter(coupon => isCouponApplicable(coupon, userId, subtotal));

        let discountAmount = 0;
        let appliedCoupon = null;

        if (req.session.appliedCoupon) {
            const sessCoupon = req.session.appliedCoupon;
            if (subtotal >= sessCoupon.minPurchase) {
                discountAmount = calculateCouponDiscount(sessCoupon, subtotal);
                appliedCoupon = sessCoupon;
            } else {
                delete req.session.appliedCoupon;
            }
        }

        const total = subtotal - discountAmount;

        const user = await userModel.findById(userId).select('mobile email walletBalance');

        res.render('users/checkout', {
            cartItems: cart.items,
            addresses,
            subtotal,
            discountAmount,
            total,
            appliedCoupon,
            coupons: applicableCoupons,
            walletBalance: user ? user.walletBalance : 0,
            userData: user ? { mobile: user.mobile || '', email: user.email || '' } : { mobile: '', email: '' }
        });
    } catch (error) {
        console.error('Load Checkout Error:', error);
        res.redirect('/cart?error=' + encodeURIComponent('Failed to load checkout page'));
    }
};

const applyCoupon = async (req, res) => {
    try {
        const { couponCode, subtotal } = req.body;
        const userId = req.session.user;

        const coupon = await couponModel.findOne({
            couponCode: couponCode.trim().toUpperCase(),
            status: 'Active',
            startDate: { $lte: new Date() },
            expiryDate: { $gte: new Date() }
        });

        if (!coupon) {
            return res.json({ success: false, message: 'Invalid or expired coupon' });
        }
        if (!isCouponApplicable(coupon, userId, subtotal)) {
            return res.json({ success: false, message: 'Coupon is not applicable or usage limit reached' });
        }
        if (subtotal < coupon.minPurchase) {
            return res.json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} is required` });
        }

        const discount = calculateCouponDiscount(coupon, subtotal);

        req.session.appliedCoupon = {
            code: coupon.couponCode,
            discountType: coupon.discountType || 'percentage',
            discountValue: coupon.discountValue ?? coupon.discountPercentage ?? 0,
            minPurchase: coupon.minPurchase,
            maxDiscountAmount: coupon.maxDiscountAmount,
            discount
        };

        res.json({
            success: true,
            message: 'Coupon applied successfully!',
            discount,
            total: subtotal - discount
        });
    } catch (error) {
        console.error('applyCoupon Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to apply coupon' });
    }
};
const removeCoupon = async (req, res) => {
    try {
        delete req.session.appliedCoupon;
        res.json({ success: true, message: 'Coupon removed successfully' });
    } catch (error) {
        console.error('removeCoupon Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to remove coupon' });
    }
};


const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
        const userId = req.session.user;

        const hmac = crypto.createHmac('sha256', process.env.PAYMENT_TEST_KEYSECRET);//HMAC is a way to generate a secure signature.
        hmac.update(razorpay_order_id + '|' + razorpay_payment_id);//Razorpay generates a signature using:order_id + payment_id + secret_key
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature === razorpay_signature) {
            await orderService.finalizeOnlineOrder(orderId, userId);
            res.json({ success: true, redirectUrl: `/order-success/${orderId}` });
        } else {
            await markOrderPaymentFailed(orderId, userId);
            res.json({
                success: false,
                redirectUrl: `/order-failed?orderId=${orderId}&message=${encodeURIComponent('Payment verification failed')}`
            });
        }
    } catch (error) {
        console.error('verify payment error', error);
        if (req.body.orderId) {
            await markOrderPaymentFailed(req.body.orderId, req.session.user).catch(markError => {
                console.error('Failed to mark payment as failed:', markError);
            });
        }
        const failedRedirect = req.body.orderId
            ? '/order-failed?orderId=' + req.body.orderId + '&message=Payment%20verification%20failed%20due%20to%20a%20server%20error'
            : '/order-failed?message=Payment%20verification%20failed%20due%20to%20a%20server%20error';
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to verify payment',
            redirectUrl: failedRedirect
        });
    }
};

const retryPayment = async (req, res) => {
    try {
        const orderId = req.params.id;
        await cleanupExpiredFailedOrders(req.session.user);
        const order = await orderModel.findById(orderId);

        if (!order || order.userId.toString() !== req.session.user.toString() || !canRetryFailedOrder(order)) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Invalid order for retry' });
        }

        const payableItems = order.items.filter(item => item.status !== 'Cancelled');
        if (payableItems.length === 0 || Number(order.totalAmount) <= 0) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: 'There are no active items left in this order to retry payment.'
            });
        }

        const options = {
            amount: Math.round(order.totalAmount * 100),
            currency: 'INR',
            receipt: order._id.toString()
        };

        const rzpOrder = await razorpay.orders.create(options);
        res.json({
            success: true,
            rzpOrderId: rzpOrder.id,
            amount: rzpOrder.amount,
            key: process.env.PAYMENT_TEST_APIKEY,
            orderId: order._id
        });
    } catch (error) {
        console.error('Error Retrying payment', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to retry payment' });
    }
};

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressId, paymentMethod, useWallet } = req.body;

        if (!addressId || !paymentMethod) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.ADDRESS_PAYMENT_REQUIRED });
        }

        const couponCode = req.session.appliedCoupon ? req.session.appliedCoupon.code : null;
        const order = await orderService.createOrder(userId, addressId, paymentMethod, couponCode, useWallet === 'true' || useWallet === true);

        delete req.session.appliedCoupon;

        if (paymentMethod === 'Online') {
            const options = {
                amount: Math.round(order.totalAmount * 100),
                currency: 'INR',
                receipt: order._id.toString()
            };
            const rzpOrder = await razorpay.orders.create(options);

            return res.json({
                success: true,
                paymentMethod: 'Online',
                rzpOrderId: rzpOrder.id,
                amount: rzpOrder.amount,
                key: process.env.PAYMENT_TEST_APIKEY,
                orderId: order._id,
                redirectUrl: `/order-success/${order._id}`
            });
        }

        res.json({
            success: true,
            paymentMethod,
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

const loadOrderFailed = async (req, res) => {
    let canRetry = false;

    if (req.query.orderId) {
        await cleanupExpiredFailedOrders(req.session.user);
        const failedOrder = await markOrderPaymentFailed(req.query.orderId, req.session.user)
            .catch(error => console.error('Failed to mark order payment failed:', error));
        canRetry = canRetryFailedOrder(failedOrder);
    }

    res.render('users/order-failed', {
        message: req.query.message || null,
        orderId: req.query.orderId || null,
        canRetry
    });
};

const loadOrders = async (req, res) => {
    try {
        const page = (req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const userId = req.session.user;
        const status = req.query.status || '';

        const totalOrders = await orderModel.countDocuments(buildVisibleOrdersQuery(userId, status));
        const totalPages = Math.ceil(totalOrders / limit);

        await cleanupExpiredFailedOrders(userId);
        const orders = await orderModel.find(buildVisibleOrdersQuery(userId, status))
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('items.productId')
            .populate('items.variantId');

        const hasPreviousPage = page > 1;
        const hasNextPage = page < totalPages;
        const hasPageNumbers = totalPages > 1;

        res.render('users/orders', {
            orders,
            canRetryFailedOrder,
            canReturnOrder: orderService.canReturnOrder,
            canReturnOrderItem: orderService.canReturnOrderItem,
            status,
            totalPages,
            page,
            limit,
            skip,
            totalOrders,
            hasPreviousPage,
            hasNextPage,
            hasPageNumbers,
            query: req.query
        });
    } catch (error) {
        console.error('Load Orders Error:', error);
        res.redirect('/');
    }
};

const loadOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        await cleanupExpiredFailedOrders(req.session.user);

        const order = await orderModel.findOne({ _id: orderId, ...visibleOrderQuery(req.session.user) })
            .populate('items.productId')
            .populate('items.variantId');

        if (!order || order.userId.toString() !== req.session.user.toString()) {
            return res.redirect('/profile/orders');
        }

        res.render('users/order-details', {
            order,
            canRetryFailedOrder,
            canReturnOrder: orderService.canReturnOrder,
            canReturnOrderItem: orderService.canReturnOrderItem
        });
    } catch (error) {
        console.error('Load Order Details Error:', error);
        res.redirect('/profile/orders');
    }
};

const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.user;
        const { reason } = req.body;
        await orderService.cancelOrder(orderId, userId, getCleanReason(reason, 'Cancelled by customer'));
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
        await orderService.cancelOrderItem(orderId, itemId, userId, getCleanReason(reason, 'Cancelled by customer'));
        res.json({ success: true, message: 'Product cancelled successfully' });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const returnOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.user;
        const { reason } = req.body;
        await orderService.returnOrder(orderId, userId, getCleanReason(reason, 'Return requested by customer'));
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
        await orderService.returnOrderItem(orderId, itemId, userId, getCleanReason(reason, 'Return requested by customer'));
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
};

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
    downloadInvoice,
    applyCoupon,
    removeCoupon,
    verifyPayment,
    retryPayment
};





