import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    size: {
        type: String,
    },
    color: {
        type: String,
    },
    quantity: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    offerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer',
    },
    discountedPrice: {
        type: Number,
    },
    image: {
        type: [String],
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    updatedAt: {
        type: Date,
        default: Date.now()
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    }
})

export default mongoose.model('Variant', variantSchema);