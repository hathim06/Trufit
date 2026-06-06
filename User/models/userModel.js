import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: function () {
            return !this.isGoogleAuth;
        }
    },
    isGoogleAuth: {
        type: Boolean,
        default: false
    },
    referalCode: {
        type: String,
        required: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    mobile: {
        type: String,
        required: false
    },
    profilePicture: {
        type: String,
        default: ''
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })
export default mongoose.model('User', userSchema);