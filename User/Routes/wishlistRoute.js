import express from 'express';
const router = express.Router();
import wishlistController from '../controllers/wishlistController.js';
import userAuth from '../Middlewares/userAuth.js';

router.get('/wishlist', userAuth.isLoggedIn, wishlistController.loadWishlist);
router.post('/wishlist/add', userAuth.isLoggedIn, wishlistController.addToWishlist);
router.post('/wishlist/remove/:id', userAuth.isLoggedIn, wishlistController.removeFromWishlist);

router.post('/wishlist/toggle', userAuth.isLoggedIn, wishlistController.toggleWishlist);

router.post('/wishlist/clear', userAuth.isLoggedIn, wishlistController.clearWishlist);

export default router;
