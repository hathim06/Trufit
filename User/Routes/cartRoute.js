import express from 'express';
const router = express.Router();
import cartController from '../controllers/cartController.js';
import userAuth from '../Middlewares/userAuth.js';

router.get('/cart', userAuth.isLoggedIn, cartController.loadCart);
router.post('/cart/add', userAuth.isLoggedIn, cartController.addToCart);
router.post('/cart/remove/:id', userAuth.isLoggedIn, cartController.removeFromCart);
router.post('/cart/update/:id', userAuth.isLoggedIn, cartController.updateCartQuantity);
router.get('/cart/clear', userAuth.isLoggedIn, cartController.clearCart);

export default router;
