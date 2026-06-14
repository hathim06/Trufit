import orderModel from '../models/orderModel.js';
import cartModel from '../models/cartModel.js';
import variantModel from '../models/variants.js';
import addressModel from '../models/addressModel.js';
import categoryModel from '../models/categoryModel.js';
import couponModel from '../models/couponModel.js';
import userModel from '../models/userModel.js';
import mongoose from 'mongoose';
import { getEffectivePrice } from '../utils/offerPricing.js';

const generateOrderId = () => {
    return 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
};

const createOrder = async (userId, addressId, paymentMethod, couponCode = null, useWallet = false) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {

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
            throw new Error('Cart is empty');
        }

        for (const cartItem of cart.items) {
            const product = cartItem.productId;

            if (!product || product.isDeleted || !product.status || product.status.toLowerCase() !== 'active') {
                throw new Error(`Product "${product?.name || 'Unknown'}" is no longer available`);
            }

            const category = await categoryModel.findById(product.categoryId);
            if (!category || !category.isListed) {
                throw new Error(`Product "${product.name}" category is no longer available`);
            }
        }

        const address = await addressModel.findById(addressId);
        if (!address) {
            throw new Error('Address not found');
        }

        let subtotal = 0;
        const orderItems = [];

        for (const item of cart.items) {
            const product = item.productId;
            const variant = item.variantId;

            if (!variant) {
                throw new Error(`Please select a valid variant for ${product.name}`);
            }

            if (variant.quantity < item.quantity) {
                throw new Error(`Insufficient stock for ${product.name} (${variant.color}/${variant.size})`);
            }

            const itemPrice = getEffectivePrice(product, variant);
            subtotal += itemPrice * item.quantity;
            orderItems.push({
                productId: product._id,
                name: product.name,
                variantId: variant._id,
                quantity: item.quantity,
                price: itemPrice
            });
        }

        let discountAmount = 0;
        let totalAmount = subtotal;
        let couponObj = null;

        if (couponCode) {
            couponObj = await couponModel.findOne({
                couponCode: couponCode.trim().toUpperCase(),
                status: 'Active',
                startDate: { $lte: new Date() },
                expiryDate: { $gte: new Date() }
            });

            if (!couponObj) {
                throw new Error('Invalid or expired coupon code');
            }
            if (couponObj.usedBy.map(id => id.toString()).includes(userId.toString())) {
                throw new Error('You have already used this coupon');
            }
            if (subtotal < couponObj.minPurchase) {
                throw new Error(`Minimum purchase of ₹${couponObj.minPurchase} is required`);
            }

            discountAmount = Math.round(subtotal * (couponObj.discountPercentage / 100));
            totalAmount = subtotal - discountAmount;
        }

        let walletAmountApplied = 0;
        if (useWallet) {
            const user = await userModel.findById(userId).session(session);
            if (!user) throw new Error('User not found');

            if (user.walletBalance > 0) {
                walletAmountApplied = Math.min(user.walletBalance, totalAmount);
                totalAmount -= walletAmountApplied;

                if (paymentMethod !== 'Online' && walletAmountApplied > 0) {
                    user.walletBalance -= walletAmountApplied;
                    user.walletTransactions.push({
                        type: 'Debit',
                        amount: walletAmountApplied,
                        description: `Wallet deduction for order payment`
                    });
                    await user.save({ session });
                }
            }
        }

        const newOrder = new orderModel({
            orderId: generateOrderId(),
            userId,
            items: orderItems,
            shippingAddress: {
                name: address.name,
                addressLine: address.addressLine,
                city: address.city,
                district: address.district,
                state: address.state,
                pincode: address.pincode,
                mobile: address.mobile
            },
            paymentMethod,
            paymentStatus: walletAmountApplied > 0 && totalAmount === 0 ? 'Paid' : 'Pending',
            orderStatus: walletAmountApplied > 0 && totalAmount === 0 ? 'Confirmed' : 'Pending',
            subtotal,
            discountAmount,
            couponCode: couponObj ? couponObj.couponCode : null,
            walletAmountApplied,
            totalAmount
        });

        if (paymentMethod === 'Wallet') {
            const user = await userModel.findById(userId).session(session);
            if (!user) throw new Error('User not found');

            // If they pay remainder/full using Wallet
            if (totalAmount > 0) {
                if (user.walletBalance < totalAmount) {
                    throw new Error('Insufficient wallet balance');
                }
                user.walletBalance -= totalAmount;
                user.walletTransactions.push({
                    type: 'Debit',
                    amount: totalAmount,
                    description: `Payment for order ${newOrder.orderId}`
                });
                await user.save({ session });
                walletAmountApplied += totalAmount;
                totalAmount = 0;
            }
            newOrder.paymentStatus = 'Paid';
            newOrder.walletAmountApplied = walletAmountApplied;
            newOrder.totalAmount = 0;
        }

        if (paymentMethod !== 'Online') {
            for (const item of cart.items) {
                await variantModel.findByIdAndUpdate(item.variantId._id, {
                    $inc: { quantity: -item.quantity }
                }, { session });
            }
        }

        await newOrder.save({ session });

        if (couponObj && paymentMethod !== 'Online') {
            couponObj.usedBy.push(userId);
            await couponObj.save({ session });
        }

        // Only delete cart for non-online payments (COD, Wallet, or if Wallet covered everything)
        // For online payments, cart will be deleted after payment verification
        if (paymentMethod !== 'Online' || totalAmount === 0) {
            await cartModel.findOneAndDelete({ userId }, { session });
        }

        await session.commitTransaction();
        session.endSession();

        return newOrder;
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

const finalizeOnlineOrder = async (orderId, userId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await orderModel.findOne({ _id: orderId, userId }).session(session);
        if (!order) throw new Error('Order not found');
        if (order.paymentMethod !== 'Online') throw new Error('Invalid online order');
        if (order.paymentStatus === 'Paid') {
            await session.commitTransaction();
            session.endSession();
            return order;
        }

        for (const item of order.items) {
            const variant = await variantModel.findById(item.variantId).session(session);
            if (!variant || variant.isDeleted) throw new Error(`Variant no longer available for ${item.name}`);
            if (variant.quantity < item.quantity) throw new Error(`Insufficient stock for ${item.name}`);
        }

        if (order.walletAmountApplied > 0) {
            const user = await userModel.findById(userId).session(session);
            if (!user) throw new Error('User not found');
            if (user.walletBalance < order.walletAmountApplied) throw new Error('Insufficient wallet balance');

            user.walletBalance -= order.walletAmountApplied;
            user.walletTransactions.push({
                type: 'Debit',
                amount: order.walletAmountApplied,
                description: `Wallet deduction for order ${order.orderId}`
            });
            await user.save({ session });
        }

        for (const item of order.items) {
            await variantModel.findByIdAndUpdate(item.variantId, {
                $inc: { quantity: -item.quantity }
            }, { session });
            item.status = 'Confirmed';
        }

        if (order.couponCode) {
            const coupon = await couponModel.findOne({ couponCode: order.couponCode }).session(session);
            if (coupon && !coupon.usedBy.map(id => id.toString()).includes(userId.toString())) {
                coupon.usedBy.push(userId);
                await coupon.save({ session });
            }
        }

        order.paymentStatus = 'Paid';
        order.orderStatus = 'Confirmed';
        await order.save({ session });

        await cartModel.findOneAndDelete({ userId }, { session });

        await session.commitTransaction();
        session.endSession();
        return order;
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

const cancelOrder = async (orderId, userId, reason = 'Cancelled by customer') => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await orderModel.findOne({ _id: orderId, userId });
        if (!order) throw new Error('Order not found');

        if (order.orderStatus === 'Cancelled' || order.orderStatus === 'Delivered') {
            throw new Error(`Order cannot be cancelled in its current state: ${order.orderStatus}`);
        }

        for (const item of order.items) {
            if (item.status !== 'Cancelled') {
                if (item.variantId) {
                    await variantModel.findByIdAndUpdate(item.variantId, {
                        $inc: { quantity: item.quantity }
                    }, { session });
                }
                item.status = 'Cancelled';
                item.cancellationReason = reason;
            }
        }

        order.orderStatus = 'Cancelled';
        order.returnReason = reason;

        let refundAmount = 0;
        if (order.walletAmountApplied && order.walletAmountApplied > 0) {
            refundAmount += order.walletAmountApplied;
        }
        if (order.paymentStatus === 'Paid' || ['Online', 'Wallet'].includes(order.paymentMethod)) {
            refundAmount += order.totalAmount;
            order.paymentStatus = 'Refunded';
        } else if (order.walletAmountApplied && order.walletAmountApplied > 0) {
            order.paymentStatus = 'Refunded';
        }

        if (refundAmount > 0) {
            const user = await userModel.findById(userId).session(session);
            if (user) {
                user.walletBalance += refundAmount;
                user.walletTransactions.push({
                    type: 'Credit',
                    amount: refundAmount,
                    description: `Refund for cancelled order ${order.orderId}`
                });
                await user.save({ session });
            }
        }

        await order.save({ session });

        await session.commitTransaction();
        session.endSession();
        return order;
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

const cancelOrderItem = async (orderId, itemId, userId, reason = '') => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await orderModel.findOne({ _id: orderId, userId });
        if (!order) throw new Error('Order not found');

        if (order.orderStatus === 'Cancelled' || order.orderStatus === 'Delivered') {
            throw new Error(`Order cannot be cancelled in its current state: ${order.orderStatus}`);
        }

        const item = order.items.find(i => i._id.toString() === itemId.toString());
        if (!item) throw new Error('Item not found in order');

        if (item.status === 'Cancelled') {
            throw new Error('Item is already cancelled');
        }

        if (item.variantId) {
            await variantModel.findByIdAndUpdate(item.variantId, {
                $inc: { quantity: item.quantity }
            }, { session });
        }

        item.status = 'Cancelled';
        item.cancellationReason = reason;

        const itemTotal = item.price * item.quantity;
        order.subtotal = Math.max(0, order.subtotal - itemTotal);
        order.totalAmount = Math.max(0, order.totalAmount - itemTotal);

        const allCancelled = order.items.every(i => i.status === 'Cancelled');
        if (allCancelled) {
            order.orderStatus = 'Cancelled';
        }

        if (order.paymentStatus === 'Paid' || ['Online', 'Wallet'].includes(order.paymentMethod) || (order.walletAmountApplied && order.walletAmountApplied > 0)) {
            const user = await userModel.findById(userId).session(session);
            if (user) {
                user.walletBalance += itemTotal;
                user.walletTransactions.push({
                    type: 'Credit',
                    amount: itemTotal,
                    description: `Refund for cancelled item in order ${order.orderId}`
                });
                await user.save({ session });
            }
            if (allCancelled) {
                order.paymentStatus = 'Refunded';
            }
        }

        await order.save({ session });

        await session.commitTransaction();
        session.endSession();
        return order;
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

const returnOrder = async (orderId, userId, reason) => {
    const order = await orderModel.findOne({ _id: orderId, userId });
    if (!order) throw new Error('Order not found');

    if (order.orderStatus !== 'Delivered') {
        throw new Error('Only delivered orders can be returned');
    }

    order.orderStatus = 'Return Pending';
    order.returnReason = reason;
    order.items.forEach(item => {
        if (item.status !== 'Cancelled' && item.status !== 'Returned') {
            item.status = 'Return Pending';
            item.returnReason = reason;
        }
    });
    return await order.save();
};

const returnOrderItem = async (orderId, itemId, userId, reason) => {
    const order = await orderModel.findOne({ _id: orderId, userId });
    if (!order) throw new Error('Order not found');

    if (order.orderStatus !== 'Delivered') {
        throw new Error('Only delivered orders can have items returned');
    }

    const item = order.items.find(i => i._id.toString() === itemId.toString());
    if (!item) throw new Error('Item not found in order');

    if (item.status === 'Cancelled') throw new Error('Cancelled items cannot be returned');
    if (item.status === 'Return Pending' || item.status === 'Returned') {
        throw new Error('Item is already pending return or returned');
    }

    item.status = 'Return Pending';
    item.returnReason = reason;
    order.orderStatus = 'Return Pending';
    order.returnReason = reason;
    return await order.save();
};

export default {
    createOrder,
    finalizeOnlineOrder,
    cancelOrder,
    cancelOrderItem,
    returnOrder,
    returnOrderItem
};
