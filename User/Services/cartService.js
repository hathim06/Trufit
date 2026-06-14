import { MESSAGES } from '../../utils/messages.js';
import cartModel from '../models/cartModel.js';
import productModel from '../models/productModel.js';
import variantModel from '../models/variants.js';
import wishlistModel from '../models/wishlistModel.js';
import { attachEffectiveOffer } from '../utils/offerPricing.js';

const getCartService = async (userId) => {
    const cart = await cartModel.findOne({ userId })
        .populate({
            path: 'items.productId',
            populate: [
                { path: 'offerId' },
                { path: 'categoryId', populate: { path: 'offerId' } }
            ]
        })
        .populate('items.variantId')
        .lean();

    if (cart && cart.items) {
        cart.items = cart.items.filter(item => {
            const product = item.productId;
            if (!product || product.isDeleted || (product.status && product.status.toLowerCase() !== 'active')) return false;
            if (product.categoryId && !product.categoryId.isListed) return false;
            if (!item.variantId || item.variantId.isDeleted) return false;
            item.productId = attachEffectiveOffer(product);
            return true;
        });
    }

    return cart;
};

const addToCartService = async (userId, productId, variantId, quantity = 1) => {
    const product = await productModel.findById(productId);
    if (!product) throw new Error(MESSAGES.PRODUCT_NOT_FOUND);

    if (product.isDeleted || (product.status && product.status.toLowerCase() !== 'active')) {
        throw new Error("This product is currently unavailable");
    }

    if (!variantId || variantId === "" || variantId === "null" || variantId === "undefined") {
        const defaultVariant = await variantModel.findOne({ productId: productId, isDeleted: false, quantity: { $gt: 0 } });
        if (!defaultVariant) {
            throw new Error("No variant in stock available");
        }
        variantId = defaultVariant._id;
    }

    const variant = await variantModel.findOne({ _id: variantId, productId, isDeleted: false });
    if (!variant) throw new Error("Selected variant is unavailable");

    let cart = await cartModel.findOne({ userId });
    const stockAvailable = variant.quantity;

    let currentCartQuantity = 0;

    if (cart) {
        const existingItem = cart.items.find(item =>
            item.productId.toString() === productId.toString() &&
            item.variantId &&
            item.variantId.toString() === variantId.toString()
        );
        if (existingItem) currentCartQuantity = existingItem.quantity;
    }

    const MAX_LIMIT = 5;
    if (currentCartQuantity + quantity > MAX_LIMIT) {
        throw new Error(`Maximum limit per person is ${MAX_LIMIT} units`);
    }

    if (currentCartQuantity + quantity > stockAvailable) {
        throw new Error(stockAvailable === 0 ? "This item is out of stock" : `Only ${stockAvailable} units available`);
    }

    if (!cart) {
        cart = new cartModel({ userId, items: [{ productId, variantId, quantity }] });
    } else {
        const existingItemIndex = cart.items.findIndex(item =>
            item.productId.toString() === productId.toString() &&
            item.variantId &&
            item.variantId.toString() === variantId.toString()
        );

        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            cart.items.push({ productId, variantId, quantity });
        }
    }

    await cart.save();

    const wishlist = await wishlistModel.findOne({ userId });
    if (wishlist) {
        wishlist.items = wishlist.items.filter(item => item.productId.toString() !== productId.toString());
        await wishlist.save();
    }

    return cart;
};

const removeFromCartService = async (userId, cartItemId) => {
    const cart = await cartModel.findOne({ userId });
    if (!cart) throw new Error("Cart not found");

    cart.items = cart.items.filter(item => item._id.toString() !== cartItemId.toString());
    await cart.save();
};

const updateCartQuantityService = async (userId, cartItemId, quantity) => {
    const cart = await cartModel.findOne({ userId });
    if (!cart) throw new Error("Cart not found");

    const item = cart.items.find(item => item._id.toString() === cartItemId.toString());
    if (!item) throw new Error("Product not found in cart");

    const variantId = item.variantId;
    if (!variantId) throw new Error("Variant no longer available");

    const variant = await variantModel.findById(variantId);
    if (!variant || variant.isDeleted) throw new Error("Variant no longer available");

    const stockAvailable = variant.quantity;

    const MAX_LIMIT = 5;
    if (quantity > MAX_LIMIT) {
        throw new Error(`Maximum limit per person is ${MAX_LIMIT} units`);
    }

    if (quantity > stockAvailable) {
        throw new Error(stockAvailable === 0 ? "Selected variant is out of stock" : `Only ${stockAvailable} units available in stock`);
    }

    item.quantity = quantity;
    return await cart.save();
};

const clearCartService = async (userId) => {
    const cart = await cartModel.findOne({ userId });
    if (cart) {
        cart.items = [];
        await cart.save();
    }
};

export default {
    getCartService,
    addToCartService,
    removeFromCartService,
    updateCartQuantityService,
    clearCartService
};
