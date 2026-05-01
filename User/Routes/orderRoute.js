const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const couponController = require('../controllers/couponController');
const userAuth = require('../Middlewares/userAuth');

router.get('/checkout', userAuth.isLoggedIn, orderController.loadCheckout);
router.post('/place-order', userAuth.isLoggedIn, orderController.placeOrder);
router.get('/profile/orders', userAuth.isLoggedIn, orderController.loadOrders);
router.get('/profile/orders/:id', userAuth.isLoggedIn, orderController.loadOrderDetails);
router.get('/profile/orders/:id/invoice', userAuth.isLoggedIn, orderController.downloadInvoice);
router.get('/profile/coupons', userAuth.isLoggedIn, orderController.loadCoupons);

router.post('/apply-coupon', userAuth.isLoggedIn, couponController.applyCoupon);
router.post('/remove-coupon', userAuth.isLoggedIn, couponController.removeCoupon);

router.patch('/profile/orders/:id/cancel', userAuth.isLoggedIn, orderController.cancelOrder);
router.patch('/profile/orders/:id/return', userAuth.isLoggedIn, orderController.returnOrder);

module.exports = router;
