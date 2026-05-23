import { MESSAGES } from '../../utils/messages.js';
import cartModel from '../models/cartModel.js';
import productModel from '../models/productModel.js';
import variantModel from '../models/variants.js';
import wishlistModel from '../models/wishlistModel.js';

const getCartService = async (userId) => {
    const cart = await cartModel.findOne({ userId })
        .populate({
            path: 'items.productId',
            populate: { path: 'categoryId' }
        })
        .populate('items.variantId');

    if (cart && cart.items) {
        cart.items = cart.items.filter(item => {
            const product = item.productId;
            if (!product || product.isDeleted || (product.status && product.status.toLowerCase() !== 'active')) return false;
            if (product.categoryId && !product.categoryId.isListed) return false;
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

    let variant = null;
    if (variantId) {
        variant = await variantModel.findById(variantId);
        if (!variant || variant.isDeleted) throw new Error("Selected variant is unavailable");
    }

    let cart = await cartModel.findOne({ userId });

    let stockAvailable = variant ? variant.quantity : product.quantity;
    let currentCartQuantity = 0;

    if (cart) {
        const existingItem = cart.items.find(item =>
            item.productId.toString() === productId.toString() &&
            (!variantId || (item.variantId && item.variantId.toString() === variantId.toString()))
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
            (!variantId || (item.variantId && item.variantId.toString() === variantId.toString()))
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

const removeFromCartService = async (userId, productId) => {
    const cart = await cartModel.findOne({ userId });
    if (!cart) throw new Error("Cart not found");

    cart.items = cart.items.filter(item => item.productId.toString() !== productId.toString());
    await cart.save();
};

const updateCartQuantityService = async (userId, productId, quantity) => {
    const cart = await cartModel.findOne({ userId });
    if (!cart) throw new Error("Cart not found");

    const item = cart.items.find(item => item.productId.toString() === productId.toString());
    if (!item) throw new Error("Product not found in cart");

    const variantId = item.variantId;
    let stockAvailable;

    if (variantId) {
        const variant = await variantModel.findById(variantId);
        if (!variant || variant.isDeleted) throw new Error("Variant no longer available");
        stockAvailable = variant.quantity;
    } else {
        const product = await productModel.findById(productId);
        if (!product || product.isDeleted || (product.status && product.status.toLowerCase() !== 'active')) {
            throw new Error("This product is currently unavailable");
        }
        stockAvailable = product.quantity;
    }

    const MAX_LIMIT = 5;
    if (quantity > MAX_LIMIT) {
        throw new Error(`Maximum limit per person is ${MAX_LIMIT} units`);
    }

    if (quantity > stockAvailable) {
        throw new Error(stockAvailable === 0 ? "Product is out of stock" : `Only ${stockAvailable} units available in stock`);
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
