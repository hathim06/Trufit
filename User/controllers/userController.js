import { MESSAGES } from '../../utils/messages.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';
import userService from '../Services/userService.js';
import userModel from '../models/userModel.js';
import addressModel from '../models/addressModel.js';
import cartModel from '../models/cartModel.js';
import wishlistModel from '../models/wishlistModel.js';
import categoryModel from '../models/categoryModel.js';
import couponModel from '../models/couponModel.js';

const loadLogin = (req, res) => {
    const message = req.query.message || req.session.authMessage;
    if (req.session.authMessage) {
        delete req.session.authMessage;
    }
    res.render('users/login', { message: message, success: req.query.success, formData: null });
};

const loadRegister = (req, res) => {
    res.render('users/signup', { message: req.query.message, success: req.query.success, formData: null });
};

const loadForgotPassword = (req, res) => {
    res.render('users/forgot-password', { message: req.query.message, success: req.query.success, formData: null });
};

const loadResetPassword = (req, res) => {
    res.render('users/reset-password', { message: req.query.message, success: req.query.success });
};

const registerUser = async (req, res) => {
    try {
        const email = req.body.email.trim().toLowerCase();
        const { firstName, lastName, password, confirmPassword } = req.body;

        // Validate password before proceeding
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;
        if (!firstName?.trim()) throw new Error("First name is required");
        if (!lastName?.trim()) throw new Error("Last name is required");
        if (!passwordRegex.test(password)) throw new Error("Weak password - Must contain at least one uppercase, one lowercase, one digit, one special character (@$!%*?&), and be 6+ characters");
        if (password !== confirmPassword) throw new Error("Passwords do not match");

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
        res.render('users/signup', { message: error.message, formData: req.body });
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
                return res.render('users/login', { message: MESSAGES.SESSION_ERROR });
            }
            res.redirect('/');
        });
    } catch (error) {
        res.render('users/login', { message: error.message, formData: req.body });
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
        if (user.isBlocked) throw new Error(MESSAGES.USER_BLOCKED);

        await userService.generateAndSendOtp(email);

        req.session.resetEmail = email;

        res.redirect('/reset-password');
    } catch (error) {
        res.render('users/forgot-password', { message: error.message, formData: req.body });
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

const resendResetOtp = async (req, res) => {
    try {
        const email = req.session.resetEmail;
        if (!email) return res.redirect('/forgot-password');

        const user = await userModel.findOne({ email });
        if (!user) throw new Error("User not found");
        if (user.isBlocked) throw new Error(MESSAGES.USER_BLOCKED);

        await userService.generateAndSendOtp(email);

        res.redirect('/reset-password?success=OTP sent again');
    } catch (error) {
        res.redirect('/reset-password?error=' + error.message);
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

        // Check if redirecting from checkout
        const redirectTo = req.body.redirect || req.query.redirect || '/address';
        res.redirect(redirectTo);
    } catch (error) {
        const redirectTo = req.body.redirect || req.query.redirect || '/address';
        res.redirect(redirectTo + '?error=' + encodeURIComponent(error.message));
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
        if (user && user.isBlocked) throw new Error(MESSAGES.USER_BLOCKED);

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
    const redirect = req.query.redirect || '/address';
    res.render('users/add-address', { redirect });
};

const loadEditAddress = async (req, res) => {
    const address = await addressModel.findById(req.params.id);
    res.render('users/address-edit', { address });
};

const updateProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            throw new Error("No file uploaded");
        }

        await userService.updateProfilePictureService({
            userId: req.session.user,
            profilePicture: req.file.path
        });

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: MESSAGES.PROFILE_PIC_UPDATED });
        }
        res.redirect('/profile?success=Profile picture updated');
    } catch (error) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
        }
        res.redirect('/profile?error=' + encodeURIComponent(error.message));
    }
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
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.EMAIL_EXISTS });
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

const getUserCounts = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.json({ success: true, cartCount: 0, wishlistCount: 0 });
        }

        const [cart, wishlist] = await Promise.all([
            cartModel.findOne({ userId: req.session.user }).populate({
                path: 'items.productId',
                select: 'status isDeleted categoryId',
                populate: { path: 'categoryId', select: 'isListed' }
            }),
            wishlistModel.findOne({ userId: req.session.user }).populate({
                path: 'items.productId',
                select: 'status isDeleted categoryId',
                populate: { path: 'categoryId', select: 'isListed' }
            })
        ]);

        const isValidProduct = (product) =>
            product &&
            !product.isDeleted &&
            product.status &&
            product.status.toLowerCase() === 'active' &&
            product.categoryId &&
            product.categoryId.isListed;

        const cartCount = cart ? cart.items.filter(item => isValidProduct(item.productId)).length : 0;
        const wishlistCount = wishlist ? wishlist.items.filter(item => isValidProduct(item.productId)).length : 0;

        res.json({ success: true, cartCount, wishlistCount });
    } catch (error) {
        console.error('Get User Counts Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to fetch counts' });
    }
};

const loadCoupons = async (req, res) => {
    try {
        const coupons = await couponModel.find({
            status: 'Active',
            startDate: { $lte: new Date() },
            expiryDate: { $gte: new Date() }
        }).sort({ createdAt: -1 });

        res.render('users/coupons', {
            activePage: 'coupons',
            coupons
        });
    } catch (error) {
        console.error('Error loading coupons:', error);
        res.redirect('/profile');
    }
};

const loadWallet = async (req, res) => {
    try {
        const user = await userModel.findById(req.session.user);
        res.render('users/wallet', { user });
    } catch (error) {
        console.error('Error loading wallet:', error);
        res.redirect('/profile');
    }
};

export default {
    registerUser,
    verifyOtp,
    loginUser,
    logoutUser,
    forgotPassword,
    resetPassword,
    resendResetOtp,
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
    googleAuthCallback,
    getUserCounts,
    loadCoupons,
    loadWallet
};