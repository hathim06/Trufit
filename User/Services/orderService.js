const orderModel = require('../models/orderModel');
const cartModel = require('../models/cartModel');
const addressModel = require('../models/addressModel');
const couponModel = require('../models/couponModel');
const productModel = require('../models/productModel');
const variantModel = require('../models/variants');
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
    const orderItems = [];

    for (const item of cart.items) {
        const product = await productModel.findById(item.productId);
        if (!product || product.isDeleted || product.status !== 'Active') {
            throw new Error(`Product "${product?.name || 'Unknown'}" is no longer available`);
        }

        let variant = null;
        if (item.variantId) {
            variant = await variantModel.findById(item.variantId);
            if (!variant || variant.isDeleted) throw new Error(`Selected variant for "${product.name}" is no longer available`);
            if (variant.quantity < item.quantity) throw new Error(`Only ${variant.quantity} units left for "${product.name}" variant`);
        } else {
            if (product.quantity < item.quantity) throw new Error(`Only ${product.quantity} units left for "${product.name}"`);
        }

        const price = variant ? variant.price : product.price;
        const itemTotal = price * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
            productId: product._id,
            variantId: variant ? variant._id : null,
            name: product.name,
            quantity: item.quantity,
            price: price,
            totalPrice: itemTotal
        });

        // Decrement stock
        if (variant) {
            variant.quantity -= item.quantity;
            await variant.save();
        } else {
            product.quantity -= item.quantity;
            await product.save();
        }
    }

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
    return await orderModel.find({ userId })
        .populate('items.productId')
        .populate('items.variantId')
        .sort({ createdAt: -1 });
};

const getOrderDetailsService = async (orderId, userId) => {
    const order = await orderModel.findOne({ _id: orderId, userId })
        .populate('items.productId')
        .populate('items.variantId');
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

const cancelOrderService = async (orderId, userId) => {
    const order = await orderModel.findOne({ _id: orderId, userId });
    if (!order) throw new Error("Order not found");
    if (order.orderStatus !== 'Placed' && order.orderStatus !== 'Processing') {
        throw new Error("Order cannot be cancelled at this stage");
    }

    order.orderStatus = 'Cancelled';
    await order.save();

    for (const item of order.items) {
        if (item.variantId) {
            const variant = await variantModel.findById(item.variantId);
            if (variant) {
                variant.quantity += item.quantity;
                await variant.save();
            }
        } else if (item.productId) {
            const product = await productModel.findById(item.productId);
            if (product) {
                product.quantity += item.quantity;
                await product.save();
            }
        }
    }
    return order;
};

const returnOrderService = async (orderId, userId) => {
    const order = await orderModel.findOne({ _id: orderId, userId });
    if (!order) throw new Error("Order not found");
    if (order.orderStatus !== 'Delivered') {
        throw new Error("Only delivered orders can be returned");
    }

    order.orderStatus = 'Returned';
    await order.save();

    for (const item of order.items) {
        if (item.variantId) {
            const variant = await variantModel.findById(item.variantId);
            if (variant) {
                variant.quantity += item.quantity;
                await variant.save();
            }
        } else if (item.productId) {
            const product = await productModel.findById(item.productId);
            if (product) {
                product.quantity += item.quantity;
                await product.save();
            }
        }
    }
    return order;
};

module.exports = {
    applyCouponService,
    removeCouponService,
    placeOrderService,
    getUserOrdersService,
    getOrderDetailsService,
    getAvailableCouponsService,
    cancelOrderService,
    returnOrderService
};
