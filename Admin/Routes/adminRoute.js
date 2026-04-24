const express = require('express');
const router = express.Router();
const adminAuth = require('../Middlewares/adminAuth');
const upload = require('../../User/Middlewares/upload');

// Controllers
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const categoryController = require('../controllers/categoryController');
const productController = require('../controllers/productController');
const couponController = require('../controllers/couponController');
const orderController = require('../controllers/orderController');
const bannerController = require('../controllers/bannerController');
const colorController = require('../controllers/colorController');

// Auth & Dashboard
router.get('/login', adminAuth.isLoggedOut, adminController.showLogin);
router.post('/login', adminAuth.isLoggedOut, adminController.login);
router.get('/logout', adminController.logout);
router.get('/dashboard', adminAuth.isAdmin, adminController.dashboard);
router.get('/profile', adminAuth.isAdmin, adminController.showProfile);
router.post('/profile', adminAuth.isAdmin, adminController.updateProfile);

// User Management
router.get('/users', adminAuth.isAdmin, userController.getUsers);
router.get('/users/view/:id', adminAuth.isAdmin, userController.viewUser);
router.patch('/users/block/:id', adminAuth.isAdmin, userController.blockUser);
router.patch('/users/unblock/:id', adminAuth.isAdmin, userController.unblockUser);
router.delete('/users/delete/:id', adminAuth.isAdmin, userController.deleteUser);

// Category Management
router.get('/categories', adminAuth.isAdmin, categoryController.getCategories);
router.get('/add-category', adminAuth.isAdmin, categoryController.loadAddCategory);
router.post('/add-category', adminAuth.isAdmin, categoryController.addCategory);
router.get('/edit-category/:id', adminAuth.isAdmin, categoryController.loadEditCategory);
router.post('/edit-category/:id', adminAuth.isAdmin, categoryController.updateCategory);
router.patch('/categories/toggle/:id', adminAuth.isAdmin, categoryController.toggleCategoryListing);
router.delete('/categories/delete/:id', adminAuth.isAdmin, categoryController.deleteCategory);

// Product Management
router.get('/products', adminAuth.isAdmin, productController.loadProductPage);
router.get('/add-product', adminAuth.isAdmin, productController.loadAddProduct);
router.post('/add-product', adminAuth.isAdmin, upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'preview1', maxCount: 1 },
    { name: 'preview2', maxCount: 1 },
    { name: 'preview3', maxCount: 1 },
    { name: 'v1_image1', maxCount: 1 }, { name: 'v1_image2', maxCount: 1 }, { name: 'v1_image3', maxCount: 1 }, { name: 'v1_image4', maxCount: 1 }, { name: 'v1_image5', maxCount: 1 },
    { name: 'v2_image1', maxCount: 1 }, { name: 'v2_image2', maxCount: 1 }, { name: 'v2_image3', maxCount: 1 }, { name: 'v2_image4', maxCount: 1 }, { name: 'v2_image5', maxCount: 1 },
    { name: 'v3_image1', maxCount: 1 }, { name: 'v3_image2', maxCount: 1 }, { name: 'v3_image3', maxCount: 1 }, { name: 'v3_image4', maxCount: 1 }, { name: 'v3_image5', maxCount: 1 },
    { name: 'v4_image1', maxCount: 1 }, { name: 'v4_image2', maxCount: 1 }, { name: 'v4_image3', maxCount: 1 }, { name: 'v4_image4', maxCount: 1 }, { name: 'v4_image5', maxCount: 1 },
    { name: 'v5_image1', maxCount: 1 }, { name: 'v5_image2', maxCount: 1 }, { name: 'v5_image3', maxCount: 1 }, { name: 'v5_image4', maxCount: 1 }, { name: 'v5_image5', maxCount: 1 }
]), productController.addProduct);
router.get('/edit-product/:id', adminAuth.isAdmin, productController.loadEditProduct);
router.post('/edit-product/:id', adminAuth.isAdmin, upload.fields([
    { name: 'v1_image1', maxCount: 1 }, { name: 'v1_image2', maxCount: 1 }, { name: 'v1_image3', maxCount: 1 }, { name: 'v1_image4', maxCount: 1 }, { name: 'v1_image5', maxCount: 1 },
    { name: 'v2_image1', maxCount: 1 }, { name: 'v2_image2', maxCount: 1 }, { name: 'v2_image3', maxCount: 1 }, { name: 'v2_image4', maxCount: 1 }, { name: 'v2_image5', maxCount: 1 },
    { name: 'v3_image1', maxCount: 1 }, { name: 'v3_image2', maxCount: 1 }, { name: 'v3_image3', maxCount: 1 }, { name: 'v3_image4', maxCount: 1 }, { name: 'v3_image5', maxCount: 1 },
    { name: 'v4_image1', maxCount: 1 }, { name: 'v4_image2', maxCount: 1 }, { name: 'v4_image3', maxCount: 1 }, { name: 'v4_image4', maxCount: 1 }, { name: 'v4_image5', maxCount: 1 },
    { name: 'v5_image1', maxCount: 1 }, { name: 'v5_image2', maxCount: 1 }, { name: 'v5_image3', maxCount: 1 }, { name: 'v5_image4', maxCount: 1 }, { name: 'v5_image5', maxCount: 1 }
]), productController.updateProduct);
router.delete('/delete-product/:id', adminAuth.isAdmin, productController.deleteProduct);
router.patch('/block-product/:id', adminAuth.isAdmin, productController.blockProduct);
router.patch('/unblock-product/:id', adminAuth.isAdmin, productController.unblockProduct);

// Variant Management (Individual)
router.post('/variants/add/:productId', adminAuth.isAdmin, upload.array('image', 3), productController.addVariant);
router.put('/variants/update/:variantId', adminAuth.isAdmin, upload.array('image', 3), productController.updateVariant);
router.delete('/variants/delete/:variantId', adminAuth.isAdmin, productController.deleteVariant);

// Coupon Management
router.get('/coupons', adminAuth.isAdmin, couponController.getCoupons);
router.get('/add-coupon', adminAuth.isAdmin, couponController.loadAddCoupon);
router.post('/add-coupon', adminAuth.isAdmin, couponController.addCoupon);
router.get('/edit-coupon/:id', adminAuth.isAdmin, couponController.loadEditCoupon);
router.post('/edit-coupon/:id', adminAuth.isAdmin, couponController.updateCoupon);
router.delete('/coupons/delete/:id', adminAuth.isAdmin, couponController.deleteCoupon);

// Order Management
router.get('/orders', adminAuth.isAdmin, orderController.getOrders);
router.patch('/orders/status/:id', adminAuth.isAdmin, orderController.changeOrderStatus);

// Banner Management
router.get('/banners', adminAuth.isAdmin, bannerController.loadBannerPage);
router.get('/add-banner', adminAuth.isAdmin, bannerController.loadAddBanner);
router.post('/add-banner', adminAuth.isAdmin, upload.single('image'), bannerController.addBanner);
router.get('/edit-banner/:id', adminAuth.isAdmin, bannerController.loadEditBanner);
router.post('/update-banner/:id', adminAuth.isAdmin, upload.single('image'), bannerController.updateBanner);
router.patch('/banner-status/:id', adminAuth.isAdmin, bannerController.toggleBannerStatus);
router.delete('/delete-banner/:id', adminAuth.isAdmin, bannerController.deleteBanner);

// Color Management
router.get('/colors', adminAuth.isAdmin, colorController.getColorsPage);
router.post('/colors/add', adminAuth.isAdmin, colorController.addColor);
router.delete('/colors/delete/:id', adminAuth.isAdmin, colorController.deleteColor);

module.exports = router;