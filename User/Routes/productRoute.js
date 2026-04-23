const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const userAuth = require('../Middlewares/userAuth');

router.get('/product/:id', productController.loadProductDetails);
router.get('/shop', productController.loadShopPage);
router.get('/search-suggestions', productController.getSearchSuggestions);

// Review routes
router.post('/product/:productId/review', userAuth.isLoggedIn, reviewController.addReview);
router.get('/product/:productId/reviews', reviewController.getProductReviews);
router.put('/review/:reviewId', userAuth.isLoggedIn, reviewController.updateReview);
router.delete('/review/:reviewId', userAuth.isLoggedIn, reviewController.deleteReview);

module.exports = router;