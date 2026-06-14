import { MESSAGES } from '../../utils/messages.js';
import bcrypt from 'bcrypt';
import userModel from '../models/userModel.js';
import addressModel from '../models/addressModel.js';
import otpModel from '../models/otpModel.js';
import sendOtpEmail from '../utils/sendEmail.js';

const findUserOrThrow = async (userId) => {
    const user = await userModel.findById(userId);
    if (!user) throw new Error(MESSAGES.USER_NOT_FOUND);
    return user;
};

const generateOtp = () => Math.floor(1000 + Math.random() * 9000);

const isOtpExpired = (createdAt) => {
    return Date.now() - createdAt > 5 * 60 * 1000;
};

const generateAndSendOtp = async (email) => {
    const otp = generateOtp();

    await otpModel.findOneAndUpdate(
        { email },
        { otp, createdAt: Date.now() },
        { upsert: true, new: true }
    );

    await sendOtpEmail(email, otp);
};

const registerUserService = async (data) => {
    const { firstName, lastName, email, password, referredBy } = data;

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await userModel.findOne({ email: normalizedEmail });
    if (existingUser) {
        if (existingUser.isBlocked) throw new Error("Account blocked");
        throw new Error("Email already exists");
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const referalCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const user = new userModel({
        firstName,
        lastName,
        email,
        password: hashPassword,
        referalCode: referalCode
    });

    if (referredBy) {
        const referrer = await userModel.findOne({ referalCode: referredBy });
        if (referrer) {
            referrer.walletBalance += 100;
            referrer.walletTransactions.push({
                type: 'Credit',
                amount: 100,
                description: 'Referral Bonus (Someone used your code)'
            });
            await referrer.save();

            user.walletBalance += 50;
            user.walletTransactions.push({
                type: 'Credit',
                amount: 50,
                description: 'Signup Bonus (Used a referral code)'
            });
        }
    }

    return await user.save();
};

const loginUserService = async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userModel.findOne({ email: normalizedEmail });
    if (!user) throw new Error("Invalid email");

    if (user.isBlocked) throw new Error("Account blocked");
    if (user.isGoogleAuth) throw new Error("Use Google login");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid password");

    return user;
};

const verifyOtpService = async (email, enteredOtp) => {
    const otpRecord = await otpModel.findOne({ email });

    if (!otpRecord) throw new Error("OTP not found");
    if (isOtpExpired(otpRecord.createdAt)) throw new Error("OTP expired");

    if (otpRecord.otp !== enteredOtp) throw new Error("Invalid OTP");

    await otpModel.deleteOne({ _id: otpRecord._id });
};

const resetPasswordService = async ({ email, otp, password, confirmPassword }) => {
    const user = await userModel.findOne({ email });
    if (!user) throw new Error(MESSAGES.USER_NOT_FOUND);

    await verifyOtpService(email, otp);

    if (password !== confirmPassword) throw new Error("Passwords do not match");

    user.password = await bcrypt.hash(password, 10);
    user.isGoogleAuth = false;

    return await user.save();
};

const addAddressService = async ({ userId, address }) => {
    await findUserOrThrow(userId);

    const isDefault = address.isDefault === true || address.isDefault === 'true';

    if (isDefault) {
        await addressModel.updateMany({ userId }, { isDefault: false });
    }

    return await addressModel.create({
        ...address,
        userId,
        isDefault
    });
};

const editAddressService = async ({ userId, addressId, address }) => {
    await findUserOrThrow(userId);

    const existing = await addressModel.findById(addressId);
    if (!existing) throw new Error("Address not found");

    const isDefault = address.isDefault === true || address.isDefault === 'true';

    if (isDefault) {
        await addressModel.updateMany({ userId }, { isDefault: false });
    }

    Object.assign(existing, { ...address, isDefault });

    return await existing.save();
};

const deleteAddressService = async (addressId) => {
    const address = await addressModel.findById(addressId);
    if (!address) throw new Error("Address not found");

    await address.deleteOne();
};

const setDefaultAddressService = async (addressId) => {
    const address = await addressModel.findById(addressId);
    if (!address) throw new Error("Address not found");

    await addressModel.updateMany({ userId: address.userId }, { isDefault: false });

    address.isDefault = true;
    return await address.save();
};

const getAddressService = async (userId) => {
    await findUserOrThrow(userId);
    return await addressModel.find({ userId });
};

const getDefaultAddressService = async (userId) => {
    return await addressModel.findOne({ userId, isDefault: true });
};

const updateProfileService = async ({ userId, profile }) => {
    const user = await findUserOrThrow(userId);

    Object.assign(user, profile);
    return await user.save();
};

const updatePasswordService = async ({ userId, password }) => {
    const user = await findUserOrThrow(userId);

    user.password = await bcrypt.hash(password, 10);
    return await user.save();
};

const updateProfilePictureService = async ({ userId, profilePicture }) => {
    const user = await findUserOrThrow(userId);

    user.profilePicture = profilePicture;
    return await user.save();
};

export default {
    registerUserService,
    loginUserService,
    generateAndSendOtp,
    verifyOtpService,
    resetPasswordService,
    addAddressService,
    editAddressService,
    deleteAddressService,
    setDefaultAddressService,
    getAddressService,
    getDefaultAddressService,
    updateProfileService,
    updatePasswordService,
    updateProfilePictureService
};