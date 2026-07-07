import { MESSAGES } from '../../utils/messages.js';
import wishlistModel from '../models/wishlistModel.js';
import productModel from '../models/productModel.js';
import variantModel from '../models/variants.js';
import { attachEffectiveOffer } from '../utils/offerPricing.js';

const getWishlistService = async (userId) => {
    const wishlist = await wishlistModel.findOne({ userId })
        .populate({
            path: 'items.productId',
            populate: { path: 'categoryId' }
        });

    if (!wishlist) return [];

    const activeItems = wishlist.items.filter(item => {
        const product = item.productId;
        if (!product || product.isDeleted) return false;
        return true;
    });

    return await Promise.all(activeItems.map(async (item) => {
        const product = item.productId;
        let unavailableReason = null;
        
        if (product.status && product.status.toLowerCase() !== 'active') {
            unavailableReason = "Product Unavailable";
        }
        if (product.categoryId && !product.categoryId.isListed) {
            unavailableReason = "Category Unavailable";
        }

        const variants = await variantModel.find({ productId: product._id, isDeleted: false });
        const productObj = attachEffectiveOffer(product);
        productObj.totalStock = variants.reduce((sum, variant) => sum + (Number(variant.quantity) || 0), 0);
        
        const itemObj = item.toObject ? item.toObject() : item;
        itemObj.productId = productObj;
        if (unavailableReason) {
            itemObj.unavailableReason = unavailableReason;
        }
        return itemObj;
    }));
};

const addToWishlistService = async (userId, productId) => {
    const product = await productModel.findById(productId);
    if (!product) throw new Error(MESSAGES.PRODUCT_NOT_FOUND);

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

const removeAllProductsFromWishlistService = async (userId) => {
    const wishlist = await wishlistModel.findOne({userId});
    if (!wishlist) throw new Error("Wishlist not found");
    const itemsCount = wishlist.items.length;
    if (itemsCount === 0) throw new Error("Wishlist is already empty");
    wishlist.items = [];
    await wishlist.save();
}

const toggleWishlistService = async (userId, productId) => {
    let wishlist = await wishlistModel.findOne({ userId });

    if (!wishlist) {
        wishlist = new wishlistModel({ userId, items: [{ productId }] });
        await wishlist.save();
        return { added: true };
    }

    const itemIndex = wishlist.items.findIndex(item => item.productId.toString() === productId.toString());

    if (itemIndex > -1) {
        wishlist.items.splice(itemIndex, 1);
        await wishlist.save();
        return { added: false };
    } else {
        wishlist.items.push({ productId });
        await wishlist.save();
        return { added: true };
    }
};

export default {
    getWishlistService,
    addToWishlistService,
    removeFromWishlistService,
    toggleWishlistService,
    removeAllProductsFromWishlistService
};


