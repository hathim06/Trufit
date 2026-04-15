const express = require('express');
const router = express.Router();
const userAuth = require('../Middlewares/userAuth');
const userController = require('../controllers/userController');
const passport = require('../Config/passport');
const upload = require('../Middlewares/upload');

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
router.get('/profile', userAuth.isLoggedIn, userController.loadProfile);
router.get('/edit-profile', userAuth.isLoggedIn, userController.loadEditProfile);
router.post('/edit-profile', userAuth.isLoggedIn, userController.editProfile);
router.get('/address', userAuth.isLoggedIn, userController.loadAddress);
router.get('/address/add', userAuth.isLoggedIn, userController.loadAddAddress);
router.post('/address/add', userAuth.isLoggedIn, userController.addAddress);
router.get('/address/edit/:id', userAuth.isLoggedIn, userController.loadEditAddress);
router.post('/address/edit/:id', userAuth.isLoggedIn, userController.editAddress);
router.post('/address/delete/:id', userAuth.isLoggedIn, userController.deleteAddress);
router.post('/address/default/:id', userAuth.isLoggedIn, userController.setDefaultAddress);
router.post('/profile/upload-picture', userAuth.isLoggedIn, upload.single('profilePicture'), userController.updateProfilePicture);
router.post('/profile/delete-picture', userAuth.isLoggedIn, userController.deleteProfilePicture);
router.post('/change-email-otp', userAuth.isLoggedIn, userController.changeEmailOtp);
router.post('/change-email-verify', userAuth.isLoggedIn, userController.changeEmail);
router.post('/update-password', userAuth.isLoggedIn, userController.updatePassword);


router.get('/auth/google', userAuth.isLoggedOut, passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account consent', session: false }));
router.get('/auth/google/callback', userAuth.isLoggedOut, passport.authenticate('google', { failureRedirect: '/login', session: false }), userController.googleAuthCallback);

router.get('/product/:id', userAuth.isLoggedIn, userController.loadProductDetails);

router.get('/shop', userAuth.isLoggedIn, userController.loadShopPage);

module.exports = router;