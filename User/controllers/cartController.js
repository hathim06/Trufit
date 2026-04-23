const cartService = require('../Services/cartService');

const loadCart = async (req, res) => {
    try {
        const cart = await cartService.getCartService(req.session.user);
        res.render('users/cart', { cart });
    } catch (error) {
        res.redirect('/login');
    }
};

const addToCart = async (req, res) => {
    try {
        const { productId, variantId, quantity = 1 } = req.body;
        await cartService.addToCartService(req.session.user, productId, variantId, quantity);
        return res.status(200).json({ success: true, message: "Added to cart" });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const removeFromCart = async (req, res) => {
    try {
        await cartService.removeFromCartService(req.session.user, req.params.id);
        res.redirect('/cart');
    } catch (error) {
        res.redirect('/login');
    }
};

const updateCartQuantity = async (req, res) => {
    try {
        await cartService.updateCartQuantityService(
            req.session.user,
            req.params.id,
            req.body.quantity
        );
        res.redirect('/cart');
    } catch (error) {
        res.redirect('/login');
    }
};

const clearCart = async (req, res) => {
    try {
        await cartService.clearCartService(req.session.user);
        res.redirect('/cart');
    } catch (error) {
        res.redirect('/login');
    }
};

module.exports = {
    loadCart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart
};
