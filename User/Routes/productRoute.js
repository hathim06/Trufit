import express from 'express';
const router = express.Router();
import productController from '../controllers/productController.js';
import reviewController from '../controllers/reviewController.js';
import userAuth from '../Middlewares/userAuth.js';

router.get('/product/:id', productController.loadProductDetails);
router.get('/shop', productController.loadShopPage);
router.get('/search-suggestions', productController.getSearchSuggestions);

// Review routes
router.post('/review/add/:productId', userAuth.isLoggedIn, reviewController.addReview);
router.get('/review/:productId', reviewController.getProductReviews);
router.put('/review/:reviewId', userAuth.isLoggedIn, reviewController.updateReview);
router.delete('/review/:reviewId', userAuth.isLoggedIn, reviewController.deleteReview);

export default router;