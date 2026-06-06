import { MESSAGES } from '../../utils/messages.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';
import wishlistService from '../Services/wishlistService.js';

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
        return res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.WISH_LIST_ADDED });
    } catch (error) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        await wishlistService.removeFromWishlistService(req.session.user, req.params.id);
        return res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.WISH_LIST_REMOVED });
    } catch (error) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const toggleWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const result = await wishlistService.toggleWishlistService(req.session.user, productId);
        return res.status(STATUS_CODES.OK).json({ 
            success: true, 
            added: result.added,
            message: result.added ? MESSAGES.WISH_LIST_ADDED : MESSAGES.WISH_LIST_REMOVED 
        });
    } catch (error) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

export default {
    loadWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist
};
