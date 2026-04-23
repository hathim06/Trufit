const productService = require('../Services/productService');

const loadProductDetails = async (req, res) => {
    try {
        const product = await productService.getProductDetailsByIdService(req.params.id);
        const variants = await productService.getVariantsByProductIdService(req.params.id);
        const relatedProducts = await productService.getRelatedProductsService(req.params.id);

        res.render('users/product', { 
            product, 
            variants, 
            relatedProducts,
            userId: req.session.user || null
        });
    } catch (error) {
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
            category: req.query.category || ''
        };
        const result = await productService.getShopProductsService(filters, page);
        const categories = await productService.getListedCategoriesService();
        res.render('users/shop', { 
            products: result.products, 
            query: filters, 
            categories,
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            totalProducts: result.totalProducts
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
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    loadProductDetails,
    loadShopPage,
    getSearchSuggestions
};