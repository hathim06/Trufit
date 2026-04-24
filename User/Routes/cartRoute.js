const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const userAuth = require('../Middlewares/userAuth');

router.get('/cart', userAuth.isLoggedIn, cartController.loadCart);
router.post('/cart/add', userAuth.isLoggedIn, cartController.addToCart);
router.post('/cart/remove/:id', userAuth.isLoggedIn, cartController.removeFromCart);
router.post('/cart/update/:id', userAuth.isLoggedIn, cartController.updateCartQuantity);
router.get('/cart/clear', userAuth.isLoggedIn, cartController.clearCart);

module.exports = router;
