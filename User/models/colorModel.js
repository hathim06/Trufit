import mongoose from 'mongoose';

const colorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    hex: {
        type: String,
        required: true,
        trim: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Color', colorSchema);
