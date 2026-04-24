const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },
    offerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer',
    },
    showOnHomepage: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        default: 'active'
    },
    price: {
        type: Number,
    },
    offerPrice: {
        type: Number,
        default: null
    },
    discount: {
        type: Number,
        default: 0
    },
    quantity: {
        type: Number,
    },
    size: {
        type: [String],
    },
    color: {
        type: [String],
    },
    image: {
        type: [String],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    highlights: {
        type: [String],
        default: []
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

module.exports = mongoose.model('Product', productSchema);