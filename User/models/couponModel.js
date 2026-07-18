import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    couponCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    description: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    minPurchase: {
        type: Number,
        required: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'flat'],
        default: 'percentage'
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    discountPercentage: {
        type: Number,
        min: 0,
        max: 100
    },
    maxDiscountAmount: {
        type: Number,
        required: true,
        min: 0
    },
    maxUsage: {
        type: Number,
        default: 100,
        min: 1
    },
    perUserLimit: {
        type: Number,
        default: 1,
        min: 1
    },
    usageCount: {
        type: Number,
        default: 0
    },
    usages: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        },
        usedAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Inactive'],
        default: 'Active'
    },
    usedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

export default mongoose.model('Coupon', couponSchema);


