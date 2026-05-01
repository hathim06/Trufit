const wishlistModel = require('../models/wishlistModel');
const productModel = require('../models/productModel');

const getWishlistService = async (userId) => {
    const wishlist = await wishlistModel.findOne({ userId })
        .populate({
            path: 'items.productId',
            populate: { path: 'categoryId' }
        });

    if (!wishlist) return [];

    // Filter out items that are deleted, inactive, or belong to unlisted categories
    const activeItems = wishlist.items.filter(item => {
        const product = item.productId;
        if (!product || product.isDeleted || (product.status && product.status.toLowerCase() !== 'active')) return false;
        if (product.categoryId && !product.categoryId.isListed) return false;
        return true;
    });

    return activeItems;
};

const addToWishlistService = async (userId, productId) => {
    const product = await productModel.findById(productId);
    if (!product) throw new Error("Product not found");

    if (product.isDeleted || (product.status && product.status.toLowerCase() !== 'active')) {
        throw new Error("This product is currently unavailable");
    }

    let wishlist = await wishlistModel.findOne({ userId });
    
    if (!wishlist) {
        wishlist = new wishlistModel({ userId, items: [{ productId }] });
        return await wishlist.save();
    }

    const itemExists = wishlist.items.some(item => item.productId.toString() === productId.toString());
    
    if (itemExists) {
        throw new Error("Product already in wishlist");
    }

    wishlist.items.push({ productId });
    return await wishlist.save();
};

const removeFromWishlistService = async (userId, productId) => {
    const wishlist = await wishlistModel.findOne({ userId });
    if (!wishlist) throw new Error("Product not found in wishlist");

    const originalLength = wishlist.items.length;
    wishlist.items = wishlist.items.filter(item => item.productId.toString() !== productId.toString());
    
    if (wishlist.items.length === originalLength) {
        throw new Error("Product not found in wishlist");
    }

    await wishlist.save();
};

module.exports = {
    getWishlistService,
    addToWishlistService,
    removeFromWishlistService
};
