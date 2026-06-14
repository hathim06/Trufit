import { STATUS_CODES } from '../../utils/statusCodes.js';
import express from 'express';
const router = express.Router();
import userAuth from '../Middlewares/userAuth.js';
import userController from '../controllers/userController.js';
import passport from '../../Config/passport.js';
import upload from '../Middlewares/upload.js';

router.get('/signup', userAuth.isLoggedOut, userController.loadRegister);
router.get('/login', userAuth.isLoggedOut, userController.loadLogin);
router.post('/signup', userAuth.isLoggedOut, userController.registerUser);
router.post('/login', userAuth.isLoggedOut, userController.loginUser);
router.get('/logout', userAuth.isLoggedIn, userController.logoutUser);
router.get('/forgot-password', userAuth.isLoggedOut, userController.loadForgotPassword);
router.get('/reset-password', userAuth.isLoggedOut, userController.loadResetPassword);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);
router.get('/verify-otp', userAuth.isLoggedOut, userController.loadOtpPage);
router.post('/verify-otp', userAuth.isLoggedOut, userController.verifyOtp);
router.get('/resend-otp', userController.resendOtp);
router.get('/resend-reset-otp', userController.resendResetOtp);
router.get('/profile', userAuth.isLoggedIn, userController.loadProfile);
router.get('/coupons', userAuth.isLoggedIn, userController.loadCoupons);
router.get('/wallet', userAuth.isLoggedIn, userController.loadWallet);
router.get('/edit-profile', userAuth.isLoggedIn, userController.loadEditProfile);
router.post('/edit-profile', userAuth.isLoggedIn, userController.editProfile);
router.get('/address', userAuth.isLoggedIn, userController.loadAddress);
router.get('/address/add', userAuth.isLoggedIn, userController.loadAddAddress);
router.post('/address/add', userAuth.isLoggedIn, userController.addAddress);
router.get('/address/edit/:id', userAuth.isLoggedIn, userController.loadEditAddress);
router.post('/address/edit/:id', userAuth.isLoggedIn, userController.editAddress);
router.post('/address/delete/:id', userAuth.isLoggedIn, userController.deleteAddress);
router.post('/address/default/:id', userAuth.isLoggedIn, userController.setDefaultAddress);
router.post('/profile/upload-picture', userAuth.isLoggedIn, (req, res, next) => {
    upload.single('profilePicture')(req, res, (err) => {
        if (err) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: err.message });
            }
            return res.redirect('/profile?error=' + encodeURIComponent(err.message));
        }
        next();
    });
}, userController.updateProfilePicture);
router.get('/address/delete/:id', userAuth.isLoggedIn, userController.deleteAddress);
router.get('/address/set-default/:id', userAuth.isLoggedIn, userController.setDefaultAddress);

// Google Auth routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), userController.googleAuthCallback);

// API for User Counts (Cart/Wishlist)
router.get('/api/user/counts', userController.getUserCounts);

export default router;