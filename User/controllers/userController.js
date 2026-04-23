const userService = require('../Services/userService');
const userModel = require('../models/userModel');
const addressModel = require('../models/addressModel');

const loadLogin = (req, res) => {
    res.render('users/login', { message: req.query.message, success: req.query.success });
};

const loadRegister = (req, res) => {
    res.render('users/signup', { message: req.query.message, success: req.query.success });
};

const loadForgotPassword = (req, res) => {
    res.render('users/forgot-password', { message: req.query.message, success: req.query.success });
};

const loadResetPassword = (req, res) => {
    res.render('users/reset-password', { message: req.query.message, success: req.query.success });
};

const registerUser = async (req, res) => {
    try {
        const email = req.body.email.trim().toLowerCase();

        const existingUser = await userModel.findOne({ email });
        if (existingUser && existingUser.isBlocked) {
            throw new Error("This account has been blocked by admin");
        }
        if (existingUser) {
            throw new Error("Email already registered. Please login instead.");
        }

        req.session.tempUser = { ...req.body, email };

        await userService.generateAndSendOtp(email);

        res.redirect('/verify-otp');
    } catch (error) {
        res.render('users/signup', { message: error.message });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp.join('');
        const tempUser = req.session.tempUser;

        if (!tempUser) throw new Error("Session expired");

        await userService.verifyOtpService(tempUser.email, enteredOtp);

        await userService.registerUserService(tempUser);

        delete req.session.tempUser;

        res.redirect('/login?success=verified');
    } catch (error) {
        res.render('users/verify-otp', { message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const user = await userService.loginUserService(req.body);

        req.session.user = user._id;
        req.session.save((err) => {
            if (err) {
                console.error("Session Save Error:", err);
                return res.render('users/login', { message: "Session error, please try again" });
            }
            res.redirect('/');
        });
    } catch (error) {
        res.render('users/login', { message: error.message });
    }
};

const logoutUser = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
};

const forgotPassword = async (req, res) => {
    try {
        const email = req.body.email.trim().toLowerCase();

        const user = await userModel.findOne({ email });
        if (!user) throw new Error("No user found with this email");
        if (user.isBlocked) throw new Error("Your account has been blocked by admin");

        await userService.generateAndSendOtp(email);

        req.session.resetEmail = email;

        res.redirect('/reset-password');
    } catch (error) {
        res.render('users/forgot-password', { message: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const email = req.session.resetEmail;

        await userService.resetPasswordService({
            email,
            otp: req.body.otp,
            password: req.body.password,
            confirmPassword: req.body.confirmPassword
        });

        delete req.session.resetEmail;

        res.redirect('/login?success=reset');
    } catch (error) {
        res.render('users/reset-password', { message: error.message });
    }
};

const loadProfile = async (req, res) => {
    try {
        const user = await userModel.findById(req.session.user);
        const defaultAddress = await userService.getDefaultAddressService(req.session.user);

        res.render('users/profile', { user, defaultAddress });
    } catch (error) {
        res.redirect('/');
    }
};

const loadAddress = async (req, res) => {
    try {
        const addresses = await userService.getAddressService(req.session.user);
        res.render('users/address', { addresses });
    } catch (error) {
        res.redirect('/');
    }
};

const addAddress = async (req, res) => {
    try {
        await userService.addAddressService({
            userId: req.session.user,
            address: req.body
        });

        res.redirect('/address');
    } catch (error) {
        res.redirect('/address?error=' + error.message);
    }
};

const editAddress = async (req, res) => {
    try {
        await userService.editAddressService({
            userId: req.session.user,
            addressId: req.params.id,
            address: req.body
        });

        res.redirect('/address');
    } catch (error) {
        res.redirect('/address?error=' + error.message);
    }
};

const deleteAddress = async (req, res) => {
    try {
        await userService.deleteAddressService(req.params.id);
        res.redirect('/address');
    } catch (error) {
        res.redirect('/address?error=' + error.message);
    }
};

const setDefaultAddress = async (req, res) => {
    try {
        await userService.setDefaultAddressService(req.params.id);
        res.redirect('/address');
    } catch (error) {
        res.redirect('/address?error=' + error.message);
    }
};

const loadOtpPage = (req, res) => {
    res.render('users/verify-otp');
};

const resendOtp = async (req, res) => {
    try {
        const email = req.session.tempUser?.email;
        if (!email) return res.redirect('/signup');

        const user = await userModel.findOne({ email });
        if (user && user.isBlocked) throw new Error("Your account has been blocked by admin");

        await userService.generateAndSendOtp(email);

        res.redirect('/verify-otp');
    } catch (error) {
        res.redirect('/verify-otp?error=' + error.message);
    }
};

const loadEditProfile = async (req, res) => {
    const user = await userModel.findById(req.session.user);
    res.render('users/profile-edit', { user });
};

const editProfile = async (req, res) => {
    await userService.updateProfileService({
        userId: req.session.user,
        profile: req.body
    });
    res.redirect('/profile');
};

const loadAddAddress = (req, res) => {
    res.render('users/add-address');
};

const loadEditAddress = async (req, res) => {
    const address = await addressModel.findById(req.params.id);
    res.render('users/address-edit', { address });
};

const updateProfilePicture = async (req, res) => {
    if (!req.file) return res.redirect('/profile');

    await userService.updateProfilePictureService({
        userId: req.session.user,
        profilePicture: req.file.path
    });

    res.redirect('/profile');
};

const deleteProfilePicture = async (req, res) => {
    await userService.updateProfilePictureService({
        userId: req.session.user,
        profilePicture: ""
    });

    res.redirect('/profile');
};

const changeEmailOtp = async (req, res) => {
    const newEmail = req.body.newEmail.trim().toLowerCase();

    const existingUser = await userModel.findOne({ email: newEmail });
    if (existingUser) {
        return res.status(400).json({ success: false, message: "This email is already registered" });
    }

    await userService.generateAndSendOtp(newEmail);

    req.session.newEmail = newEmail;

    res.json({ success: true });
};

const changeEmail = async (req, res) => {
    const { otp } = req.body;
    const newEmail = req.session.newEmail;

    await userService.verifyOtpService(newEmail, otp);

    await userModel.findByIdAndUpdate(req.session.user, { email: newEmail });

    res.json({ success: true });
};

const updatePassword = async (req, res) => {
    await userService.updatePasswordService({
        userId: req.session.user,
        password: req.body.newPassword
    });

    res.json({ success: true });
};

const googleAuthCallback = async (req, res) => {
    if (req.user.isBlocked) {
        req.logout((err) => {
            if (err) console.error("Logout Error:", err);
            res.redirect('/login?message=Your account has been blocked by admin');
        });
        return;
    }
    req.session.user = req.user._id;
    req.session.save((err) => {
        if (err) {
            console.error("Google Session Save Error:", err);
            return res.redirect('/login?message=Session error');
        }
        res.redirect('/');
    });
};

module.exports = {
    registerUser,
    verifyOtp,
    loginUser,
    logoutUser,
    forgotPassword,
    resetPassword,
    loadProfile,
    loadAddress,
    addAddress,
    editAddress,
    deleteAddress,
    setDefaultAddress,
    loadLogin,
    loadRegister,
    loadForgotPassword,
    loadResetPassword,
    loadOtpPage,
    resendOtp,
    loadEditProfile,
    editProfile,
    loadAddAddress,
    loadEditAddress,
    updateProfilePicture,
    deleteProfilePicture,
    changeEmailOtp,
    changeEmail,
    updatePassword,
    googleAuthCallback
};