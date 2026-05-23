import { STATUS_CODES } from '../../utils/statusCodes.js';
import productService from '../Services/productService.js';
import wishlistModel from '../models/wishlistModel.js';

const loadProductDetails = async (req, res) => {
    try {
        const product = await productService.getProductDetailsByIdService(req.params.id);
        
        if (!product || product.isDeleted || (product.status && product.status.toLowerCase() !== 'active')) {
            return res.redirect('/shop');
        }

        const variants = await productService.getVariantsByProductIdService(req.params.id);
        const relatedProducts = await productService.getRelatedProductsService(req.params.id);

        let isInWishlist = false;
        if (req.session.user) {
            const wishlist = await wishlistModel.findOne({ userId: req.session.user });
            if (wishlist) {
                isInWishlist = wishlist.items.some(item => item.productId.toString() === req.params.id);
            }
        }

        res.render('users/product', { 
            product, 
            variants, 
            relatedProducts,
            userId: req.session.user || null,
            isInWishlist
        });
    } catch (error) {
        console.error("Product Details Error:", error);
        res.redirect('/shop');
    }
};

const loadShopPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const filters = {
            priceSort: req.query.priceSort || '',
            minPrice: req.query.minPrice || '',
            maxPrice: req.query.maxPrice || '',
            size: req.query.size || '',
            category: req.query.category || '',
            search: req.query.search || ''
        };
        const result = await productService.getShopProductsService(filters, page);
        const categories = await productService.getListedCategoriesService();

        let wishlistProductIds = [];
        if (req.session.user) {
            const wishlist = await wishlistModel.findOne({ userId: req.session.user });
            if (wishlist) {
                wishlistProductIds = wishlist.items.map(item => item.productId.toString());
            }
        }

        res.render('users/shop', { 
            products: result.products, 
            query: filters, 
            categories,
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            totalProducts: result.totalProducts,
            wishlistProductIds
        });
    } catch (error) {
        console.error('Shop page error:', error);
        res.redirect('/login');
    }
};

const getSearchSuggestions = async (req, res) => {
    try {
        const { q } = req.query;
        const suggestions = await productService.getSearchSuggestionsService(q);
        res.json({ success: true, results: suggestions });
    } catch (error) {
        console.error('Search suggestions error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

export default {
    loadProductDetails,
    loadShopPage,
    getSearchSuggestions
};