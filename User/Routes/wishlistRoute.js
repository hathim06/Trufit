const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const userAuth = require('../Middlewares/userAuth');

router.get('/wishlist', userAuth.isLoggedIn, wishlistController.loadWishlist);
router.post('/add-to-wishlist', userAuth.isLoggedIn, wishlistController.addToWishlist);
router.get('/wishlist/remove/:id', userAuth.isLoggedIn, wishlistController.removeFromWishlist);

module.exports = router;
