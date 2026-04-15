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
        req.session.tempUser = req.body;

        await userService.generateAndSendOtp(req.body.email);

        res.redirect('/users/verify-otp');
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

        res.redirect('/users/login?success=verified');
    } catch (error) {
        res.render('users/verify-otp', { message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const user = await userService.loginUserService(req.body);

        req.session.user = user._id;
        res.redirect('/');
    } catch (error) {
        res.render('users/login', { message: error.message });
    }
};

const logoutUser = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/users/login");
    });
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        await userService.generateAndSendOtp(email);

        req.session.resetEmail = email;

        res.redirect('/users/reset-password');
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

        res.redirect('/users/login?success=reset');
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

        res.redirect('/users/address');
    } catch (error) {
        res.redirect('/users/address?error=' + error.message);
    }
};

const editAddress = async (req, res) => {
    try {
        await userService.editAddressService({
            userId: req.session.user,
            addressId: req.params.id,
            address: req.body
        });

        res.redirect('/users/address');
    } catch (error) {
        res.redirect('/users/address?error=' + error.message);
    }
};

const deleteAddress = async (req, res) => {
    try {
        await userService.deleteAddressService(req.params.id);
        res.redirect('/users/address');
    } catch (error) {
        res.redirect('/users/address?error=' + error.message);
    }
};

const setDefaultAddress = async (req, res) => {
    try {
        await userService.setDefaultAddressService(req.params.id);
        res.redirect('/users/address');
    } catch (error) {
        res.redirect('/users/address?error=' + error.message);
    }
};

const loadProductDetails = async (req, res) => {
    try {
        const product = await userService.getProductDetailsByIdService(req.params.id);
        const variants = await userService.getVariantsByProductIdService(req.params.id);

        res.render('users/product', { product, variants });
    } catch (error) {
        res.redirect('/');
    }
};

const loadOtpPage = (req, res) => {
    res.render('users/verify-otp');
};

const resendOtp = async (req, res) => {
    try {
        const email = req.session.tempUser?.email;
        if (!email) return res.redirect('/users/signup');

        await userService.generateAndSendOtp(email);

        res.redirect('/users/verify-otp');
    } catch (error) {
        res.redirect('/users/verify-otp?error=' + error.message);
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
    res.redirect('/users/profile');
};

const loadAddAddress = (req, res) => {
    res.render('users/add-address');
};

const loadEditAddress = async (req, res) => {
    const address = await addressModel.findById(req.params.id);
    res.render('users/address-edit', { address });
};

const updateProfilePicture = async (req, res) => {
    if (!req.file) return res.redirect('/users/profile');

    await userService.updateProfilePictureService({
        userId: req.session.user,
        profilePicture: req.file.path
    });

    res.redirect('/users/profile');
};

const deleteProfilePicture = async (req, res) => {
    await userService.updateProfilePictureService({
        userId: req.session.user,
        profilePicture: ""
    });

    res.redirect('/users/profile');
};

const changeEmailOtp = async (req, res) => {
    const { newEmail } = req.body;

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
    req.session.user = req.user._id;
    res.redirect('/');
};

const loadShopPage = async (req, res) => {
    try {
        const products = await userService.getShopProductsService();
        res.render('users/shop', { products });
    } catch (error) {
        res.redirect('/users/login');
    }
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
    loadProductDetails,
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
    googleAuthCallback,
    loadShopPage
};