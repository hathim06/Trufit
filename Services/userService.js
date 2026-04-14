const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const addressModel = require('../models/addressModel');
const otpModel = require('../models/otpModel');

const registerUserService = async (data) => {
    const { firstName, lastName, email, password, confirmPassword, referalCode } = data;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;

    if (!firstName || firstName.trim() === "") throw new Error("First name is required");
    if (!lastName || lastName.trim() === "") throw new Error("Last name is required");
    if (!emailRegex.test(email)) throw new Error("Invalid email format");
    if (!passwordRegex.test(password)) throw new Error("Password must include uppercase, lowercase, number and special character");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    if (password !== confirmPassword) throw new Error("Passwords do not match");

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
        throw new Error("Email already exists");
    }
    if (existingUser && existingUser.isBlocked) {
        throw new Error("This account is blocked. Contact support.");
    }
    if (!passwordRegex.test(password)) {
        throw new Error("Weak password");
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = new userModel({
        firstName,
        lastName,
        email,
        password: hashPassword,
        referalCode: referalCode || ""
    });

    return await newUser.save();
};


const loginUserService = async (data) => {
    const { email, password } = data;

    const user = await userModel.findOne({ email });
    if (!user) {
        throw new Error("Invalid email address.");
    }

    if (user.isBlocked) {
        throw new Error("Your account is blocked by admin.");
    }
    if (user.isGoogleAuth) {
        throw new Error("You are logged in with Google. Please use Google login.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error("Invalid password");
    }

    return user;
};

const forgotPasswordService = async (data) => {
    const { email } = data;

    const user = await userModel.findOne({ email });
    if (!user) {
        throw new Error("User with this email does not exist");
    }

    const otp = Math.floor(1000 + Math.random() * 9000);

    await otpModel.findOneAndUpdate(
        { email: email },
        { otp: otp, createdAt: Date.now() },
        { upsert: true, new: true }
    );

    return otp;
};

const resetPasswordService = async (data) => {
    const { email, otp, password, confirmPassword } = data;

    const user = await userModel.findOne({ email });
    if (!user) {
        throw new Error("User not found");
    }

    const otpRecord = await otpModel.findOne({ email: email });

    if (!otpRecord) {
        throw new Error("OTP expired or not found");
    }

    if (otpRecord.otp !== otp.toString()) {
        throw new Error("Invalid OTP");
    }

    if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
    }

    const hashPassword = await bcrypt.hash(password, 10);
    user.password = hashPassword;
    user.isGoogleAuth = false;
    await user.save();

    await otpModel.deleteOne({ _id: otpRecord._id });

    return user;
};

const addAddressService = async (data) => {
    const { userId, address } = data;
    const user = await userModel.findById(userId);
    if (!user) {
        throw new Error('user not found');
    }
    if (!address) {
        throw new Error('address is required');
    }

    if (address.isDefault === 'true' || address.isDefault === true) {
        await addressModel.updateMany({ userId }, { $set: { isDefault: false } });
    }

    const newAddress = new addressModel({
        userId,
        name: address.name,
        addressLine: address.addressLine,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        district: address.district,
        mobile: address.mobile,
        isDefault: address.isDefault === 'true' || address.isDefault === true
    })
    await newAddress.save();
    return newAddress;
}

const getAddressService = async (userId) => {
    const user = await userModel.findById(userId);
    if (!user) {
        throw new Error('user not found');
    }
    const addresses = await addressModel.find({ userId });
    return addresses;
}

const getAddressByIdService = async (addressId) => {
    const address = await addressModel.findById(addressId);
    if (!address) {
        throw new Error('address not found');
    }
    return address;
}

const editAddressService = async (data) => {
    const { userId, addressId, address } = data;
    const user = await userModel.findById(userId);
    if (!user) {
        throw new Error('user not found');
    }
    const Address = await addressModel.findById(addressId);
    if (!Address) {
        throw new Error('address not found');
    }

    if (address.isDefault === 'true' || address.isDefault === true) {
        await addressModel.updateMany({ userId }, { $set: { isDefault: false } });
    }

    Address.name = address.name;
    Address.addressLine = address.addressLine;
    Address.city = address.city;
    Address.state = address.state;
    Address.pincode = address.pincode;
    Address.district = address.district;
    Address.mobile = address.mobile;
    Address.isDefault = address.isDefault === 'true' || address.isDefault === true;
    await Address.save();
    return Address;
}

const deleteAddressService = async (addressId) => {
    const address = await addressModel.findById(addressId);
    if (!address) {
        throw new Error('address not found');
    }
    await address.deleteOne();
    return address;
}

const setDefaultAddressService = async (addressId) => {
    const address = await addressModel.findById(addressId);
    if (!address) {
        throw new Error('address not found');
    }

    await addressModel.updateMany({ userId: address.userId }, { $set: { isDefault: false } });

    address.isDefault = true;
    await address.save();
    return address;
}

const getDefaultAddressService = async (userId) => {
    const user = await userModel.findById(userId);
    if (!user) {
        throw new Error('user not found');
    }
    const address = await addressModel.findOne({ userId, isDefault: true });
    return address;
}

const updateProfileService = async (data) => {
    const { userId, profile } = data;
    const user = await userModel.findById(userId);
    if (!user) {
        throw new Error('user not found');
    }
    user.firstName = profile.firstName;
    user.lastName = profile.lastName;
    user.email = profile.email;
    await user.save();
    return user;
}

const updatePasswordService = async (data) => {
    const { userId, password } = data;
    const user = await userModel.findById(userId);
    if (!user) {
        throw new Error('user not found');
    }
    const hashPassword = await bcrypt.hash(password, 10);
    user.password = hashPassword;
    await user.save();
    return user;
}

const updateProfilePictureService = async (data) => {
    const { userId, profilePicture } = data;
    const user = await userModel.findById(userId);
    if (!user) {
        throw new Error('user not found');
    }
    user.profilePicture = profilePicture;
    await user.save();
    return user;
}

const updateMobileService = async (data) => {
    const { userId, mobile } = data;
    const user = await userModel.findById(userId);
    if (!user) {
        throw new Error('user not found');
    }
    user.mobile = mobile;
    await user.save();
    return user;
}

const updateEmailService = async (data) => {
    const { userId, email } = data;
    const user = await userModel.findById(userId);
    if (!user) {
        throw new Error('user not found');
    }
    user.email = email;
    await user.save();
    return user;
}

module.exports = {
    registerUserService,
    loginUserService,
    forgotPasswordService,
    resetPasswordService,
    addAddressService,
    getAddressService,
    getAddressByIdService,
    editAddressService,
    deleteAddressService,
    setDefaultAddressService,
    getDefaultAddressService,
    updateProfileService,
    updatePasswordService,
    updateProfilePictureService,
    updateMobileService,
    updateEmailService
};