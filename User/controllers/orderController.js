import { MESSAGES } from '../../utils/messages.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';
import orderService from '../Services/orderService.js';
import cartModel from '../models/cartModel.js';
import addressModel from '../models/addressModel.js';
import orderModel from '../models/orderModel.js';
import couponModel from '../models/couponModel.js';
import userModel from '../models/userModel.js';
import razorpay from '../../Config/razorpay.js';
import crypto from 'crypto';
import { attachEffectiveOffer, getEffectivePrice } from '../utils/offerPricing.js';

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

        // Auto-remove stale cart items that have no selected variant.
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
            return res.redirect('/cart?error=' + encodeURIComponent(`"${names}" was removed from your cart because no size/color variant was selected. Please add it again and choose a variant.`));
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
            usedBy: { $ne: userId }
        });

        let discountAmount = 0;
        let appliedCoupon = null;

        if (req.session.appliedCoupon) {
            const sessCoupon = req.session.appliedCoupon;
            if (subtotal >= sessCoupon.minPurchase) {
                discountAmount = Math.round(subtotal * (sessCoupon.percentage / 100));
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
            coupons,
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
        if (coupon.usedBy.map(id => id.toString()).includes(userId.toString())) {
            return res.json({ success: false, message: 'You have already used this coupon' });
        }
        if (subtotal < coupon.minPurchase) {
            return res.json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} is required` });
        }

        const discount = Math.round(subtotal * (coupon.discountPercentage / 100));

        req.session.appliedCoupon = {
            code: coupon.couponCode,
            percentage: coupon.discountPercentage,
            minPurchase: coupon.minPurchase,
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
            await orderModel.findByIdAndUpdate(orderId, { paymentStatus: 'Failed' });
            res.json({
                success: false,
                redirectUrl: `/order-failed?orderId=${orderId}&message=${encodeURIComponent('Payment verification failed')}`
            });
        }
    } catch (error) {
        console.error('verify payment error', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to verify payment',
            redirectUrl: '/order-failed?message=Payment%20verification%20failed%20due%20to%20a%20server%20error'
        });
    }
};

const retryPayment = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await orderModel.findById(orderId);

        if (!order || order.paymentStatus === 'Paid' || order.orderStatus === 'Cancelled') {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Invalid order for retry' });
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

const loadOrderFailed = (req, res) => {
    res.render('users/order-failed', {
        message: req.query.message || null,
        orderId: req.query.orderId || null
    });
};

const loadOrders = async (req, res) => {
    try {
        const userId = req.session.user;

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
        const { reason } = req.body;
        await orderService.cancelOrder(orderId, userId, reason || 'Cancelled by customer');
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
