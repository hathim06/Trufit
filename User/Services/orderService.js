import orderModel from '../models/orderModel.js';
import cartModel from '../models/cartModel.js';
import variantModel from '../models/variants.js';
import productModel from '../models/productModel.js';
import addressModel from '../models/addressModel.js';
import mongoose from 'mongoose';

const generateOrderId = () => {
    return 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
};

const createOrder = async (userId, addressId, paymentMethod) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const cart = await cartModel.findOne({ userId }).populate('items.productId').populate('items.variantId');
        if (!cart || cart.items.length === 0) {
            throw new Error('Cart is empty');
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

            if (variant) {
                if (variant.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for ${product.name} (${variant.color}/${variant.size})`);
                }
                subtotal += variant.price * item.quantity;
                orderItems.push({
                    productId: product._id,
                    name: product.name,
                    variantId: variant._id,
                    quantity: item.quantity,
                    price: variant.price
                });
            } else {
                if (product.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for ${product.name}`);
                }
                subtotal += product.price * item.quantity;
                orderItems.push({
                    productId: product._id,
                    name: product.name,
                    quantity: item.quantity,
                    price: product.price
                });
            }
        }

        const discountAmount = 0;
        const totalAmount = subtotal;

        for (const item of cart.items) {
            if (item.variantId) {
                await variantModel.findByIdAndUpdate(item.variantId._id, {
                    $inc: { quantity: -item.quantity }
                }, { session });
                await productModel.findByIdAndUpdate(item.productId._id, {
                    $inc: { quantity: -item.quantity }
                }, { session });
            } else {
                await productModel.findByIdAndUpdate(item.productId._id, {
                    $inc: { quantity: -item.quantity }
                }, { session });
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
            paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Paid',
            orderStatus: 'Pending',
            subtotal,
            discountAmount,
            totalAmount
        });

        await newOrder.save({ session });

        await cartModel.findOneAndDelete({ userId }, { session });

        await session.commitTransaction();
        session.endSession();

        return newOrder;
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

const cancelOrder = async (orderId, userId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await orderModel.findOne({ _id: orderId, userId });
        if (!order) throw new Error('Order not found');

        if (order.orderStatus === 'Cancelled' || order.orderStatus === 'Delivered') {
            throw new Error(`Order cannot be cancelled in its current state: ${order.orderStatus}`);
        }


        for (const item of order.items) {
            if (item.variantId) {
                await variantModel.findByIdAndUpdate(item.variantId, {
                    $inc: { quantity: item.quantity }
                }, { session });
                await productModel.findByIdAndUpdate(item.productId, {
                    $inc: { quantity: item.quantity }
                }, { session });
            } else {
                await productModel.findByIdAndUpdate(item.productId, {
                    $inc: { quantity: item.quantity }
                }, { session });
            }
        }

        order.orderStatus = 'Cancelled';
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

    order.orderStatus = 'Returned';
    order.returnReason = reason;
    return await order.save();
};

export default {
    createOrder,
    cancelOrder,
    returnOrder
};
