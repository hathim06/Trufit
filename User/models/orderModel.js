import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: {
            type: String
        },
        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Variant'
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Return Pending'],
            default: 'Pending'
        },
        cancellationReason: {
            type: String
        },
        returnReason: {
            type: String
        },
        deliveredAt: {
            type: Date,
            default: null
        }
    }],
    shippingAddress: {
        name: String,
        addressLine: String,
        city: String,
        district: String,
        state: String,
        pincode: String,
        mobile: String
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Online', 'Wallet'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending'
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Return Pending'],
        default: 'Pending'
    },
    subtotal: {
        type: Number,
        required: true
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    couponCode: {
        type: String,
        default: null
    },
    totalAmount: {
        type: Number,
        required: true
    },
    walletAmountApplied: {
        type: Number,
        default: 0
    },
    returnReason: {
        type: String
    },
    returnStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    deliveredAt: {
        type: Date,
        default: null
    },
    failedPaymentExpiresAt: {
        type: Date,
        default: null,
        index: { expireAfterSeconds: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);


