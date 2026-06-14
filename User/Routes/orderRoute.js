import express from 'express';
const router = express.Router();
import orderController from '../controllers/orderController.js';
import userAuth from '../Middlewares/userAuth.js';

router.get('/checkout', userAuth.isLoggedIn, orderController.loadCheckout);
router.post('/place-order', userAuth.isLoggedIn, orderController.placeOrder);
router.get('/order-success/:id', userAuth.isLoggedIn, orderController.loadOrderSuccess);
router.get('/order-failed', userAuth.isLoggedIn, orderController.loadOrderFailed);
router.get('/profile/orders', userAuth.isLoggedIn, orderController.loadOrders);
router.get('/profile/orders/:id', userAuth.isLoggedIn, orderController.loadOrderDetails);
router.patch('/profile/orders/:id/cancel', userAuth.isLoggedIn, orderController.cancelOrder);
router.patch('/profile/orders/:id/cancel-item', userAuth.isLoggedIn, orderController.cancelOrderItem);
router.patch('/profile/orders/:id/return', userAuth.isLoggedIn, orderController.returnOrder);
router.patch('/profile/orders/:id/return-item', userAuth.isLoggedIn, orderController.returnOrderItem);
router.get('/profile/orders/:id/invoice', userAuth.isLoggedIn, orderController.downloadInvoice);

//coupons

router.post('/apply-coupon', userAuth.isLoggedIn, orderController.applyCoupon);
router.post('/remove-coupon', userAuth.isLoggedIn, orderController.removeCoupon);
router.post('/verify-payment', userAuth.isLoggedIn, orderController.verifyPayment);
router.post('/profile/orders/:id/retry-payment', userAuth.isLoggedIn, orderController.retryPayment);


export default router;
