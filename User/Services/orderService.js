const orderModel = require('../models/orderModel');
const cartModel = require('../models/cartModel');
const addressModel = require('../models/addressModel');
const couponModel = require('../models/couponModel');
const cartService = require('./cartService');

const applyCouponService = async (userId, couponCode, cartTotal) => {
    const coupon = await couponModel.findOne({ 
        couponCode: couponCode.toUpperCase(), 
        isDeleted: false, 
        status: 'Active' 
    });

    if (!coupon) throw new Error("Invalid or expired coupon code");

    const now = new Date();
    if (now < new Date(coupon.startDate)) throw new Error("Coupon is not yet active");
    if (now > new Date(coupon.expiryDate)) throw new Error("Coupon has expired");

    if (cartTotal < coupon.minPurchase) {
        throw new Error(`Minimum purchase of ₹${coupon.minPurchase} required for this coupon`);
    }

    const cart = await cartModel.findOne({ userId });
    if (!cart) throw new Error("Cart not found");

    cart.appliedCoupon = {
        code: coupon.couponCode,
        discountPercentage: coupon.discountPercentage
    };

    await cart.save();
    return cart.appliedCoupon;
};

const removeCouponService = async (userId) => {
    const cart = await cartModel.findOne({ userId });
    if (!cart) throw new Error("Cart not found");

    cart.appliedCoupon = {
        code: null,
        discountPercentage: 0
    };

    await cart.save();
};

const placeOrderService = async (userId, orderData) => {
    const { addressId, paymentMethod } = orderData;

    const cart = await cartService.getCartService(userId);
    if (!cart || cart.items.length === 0) throw new Error("Cart is empty");

    const address = await addressModel.findById(addressId);
    if (!address) throw new Error("Delivery address not found");

    let subtotal = 0;
    const orderItems = cart.items.map(item => {
        const product = item.productId;
        const variant = item.variantId;
        const price = variant ? variant.price : product.price;
        const itemTotal = price * item.quantity;
        subtotal += itemTotal;

        return {
            productId: product._id,
            variantId: variant ? variant._id : null,
            name: product.name,
            quantity: item.quantity,
            price: price,
            totalPrice: itemTotal
        };
    });

    const discountAmount = Math.round((subtotal * (cart.appliedCoupon.discountPercentage || 0)) / 100);
    const grandTotal = subtotal - discountAmount;

    const order = new orderModel({
        userId,
        items: orderItems,
        deliveryAddress: {
            name: address.name,
            addressLine: address.addressLine,
            city: address.city,
            district: address.district,
            state: address.state,
            pincode: address.pincode,
            mobile: address.mobile
        },
        subtotal,
        discountAmount,
        couponApplied: cart.appliedCoupon.code ? cart.appliedCoupon : null,
        grandTotal,
        paymentMethod,
        paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Paid'
    });

    await order.save();
    await cartService.clearCartService(userId);

    return order;
};

const getUserOrdersService = async (userId) => {
    return await orderModel.find({ userId }).sort({ createdAt: -1 });
};

const getOrderDetailsService = async (orderId, userId) => {
    const order = await orderModel.findOne({ _id: orderId, userId });
    if (!order) throw new Error("Order not found");
    return order;
};

const getAvailableCouponsService = async () => {
    return await couponModel.find({
        isDeleted: false,
        status: 'Active',
        expiryDate: { $gt: new Date() }
    }).sort({ expiryDate: 1 });
};

module.exports = {
    applyCouponService,
    removeCouponService,
    placeOrderService,
    getUserOrdersService,
    getOrderDetailsService,
    getAvailableCouponsService
};
