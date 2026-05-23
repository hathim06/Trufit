import { MESSAGES } from '../../utils/messages.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';
import cartService from '../Services/cartService.js';

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
        return res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.CART_ADDED });
    } catch (error) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const removeFromCart = async (req, res) => {
    try {
        await cartService.removeFromCartService(req.session.user, req.params.id);
        return res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.CART_REMOVED });
    } catch (error) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const updateCartQuantity = async (req, res) => {
    try {
        const { quantity } = req.body;
        await cartService.updateCartQuantityService(
            req.session.user,
            req.params.id,
            quantity
        );
        return res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.CART_QUANTITY_UPDATED });
    } catch (error) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
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

export default {
    loadCart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart
};
