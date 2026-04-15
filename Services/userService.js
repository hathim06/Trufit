const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const addressModel = require('../models/addressModel');
const otpModel = require('../models/otpModel');
const productModel = require('../models/productModel');
const variantModel = require('../models/variants');
const sendOtpEmail = require('../utils/sendEmail');

// ================= HELPER =================
const findUserOrThrow = async (userId) => {
    const user = await userModel.findById(userId);
    if (!user) throw new Error('User not found');
    return user;
};

const generateOtp = () => Math.floor(1000 + Math.random() * 9000);

const isOtpExpired = (createdAt) => {
    return Date.now() - createdAt > 5 * 60 * 1000; // 5 min
};

// ================= OTP SERVICE =================
const generateAndSendOtp = async (email) => {
    const otp = generateOtp();

    await otpModel.findOneAndUpdate(
        { email },
        { otp, createdAt: Date.now() },
        { upsert: true, new: true }
    );

    await sendOtpEmail(email, otp);
};

// ================= AUTH =================
const registerUserService = async (data) => {
    const { firstName, lastName, email, password, confirmPassword, referalCode } = data;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;

    if (!firstName?.trim()) throw new Error("First name is required");
    if (!lastName?.trim()) throw new Error("Last name is required");
    if (!emailRegex.test(email)) throw new Error("Invalid email");
    if (!passwordRegex.test(password)) throw new Error("Weak password");
    if (password !== confirmPassword) throw new Error("Passwords do not match");

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
        if (existingUser.isBlocked) throw new Error("Account blocked");
        throw new Error("Email already exists");
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = new userModel({
        firstName,
        lastName,
        email,
        password: hashPassword,
        referalCode: referalCode || ""
    });

    return await user.save();
};

const loginUserService = async ({ email, password }) => {
    const user = await userModel.findOne({ email });
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

// ================= PASSWORD =================
const resetPasswordService = async ({ email, otp, password, confirmPassword }) => {
    const user = await userModel.findOne({ email });
    if (!user) throw new Error("User not found");

    await verifyOtpService(email, otp);

    if (password !== confirmPassword) throw new Error("Passwords do not match");

    user.password = await bcrypt.hash(password, 10);
    user.isGoogleAuth = false;

    return await user.save();
};

// ================= ADDRESS =================
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

// ================= PROFILE =================
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

// ================= PRODUCT =================
const getProductDetailsByIdService = async (productId) => {
    const product = await productModel.findById(productId);
    if (!product) throw new Error("Product not found");
    return product;
};

const getVariantsByProductIdService = async (productId) => {
    return await variantModel.find({ productId, isDeleted: false });
};

const getShopProductsService = async () => {
    return await productModel.find({ isDeleted: false });
};

const getShopProductDetailsService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid product ID");
    }

    const product = await productModel.findById(id);

    if (!product) {
        throw new Error("Product not found");
    }

    return product;
};

module.exports = {
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
    updateProfilePictureService,
    getProductDetailsByIdService,
    getVariantsByProductIdService,
    getShopProductDetailsService,
    getShopProductsService
};