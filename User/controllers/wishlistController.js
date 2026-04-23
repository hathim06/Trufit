const wishlistService = require('../Services/wishlistService');

const loadWishlist = async (req, res) => {
    try {
        const wishlist = await wishlistService.getWishlistService(req.session.user);
        res.render('users/wishlist', { wishlist });
    } catch (error) {
        res.redirect('/login');
    }
};

const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        await wishlistService.addToWishlistService(req.session.user, productId);
        return res.status(200).json({ success: true, message: "Added to wishlist" });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        await wishlistService.removeFromWishlistService(req.session.user, req.params.id);
        res.redirect('/wishlist');
    } catch (error) {
        res.redirect('/login');
    }
};

module.exports = {
    loadWishlist,
    addToWishlist,
    removeFromWishlist
};
