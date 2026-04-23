const cartModel = require('../models/cartModel');
const productModel = require('../models/productModel');
const variantModel = require('../models/variants');

const getCartService = async (userId) => {
    return await cartModel.findOne({ userId }).populate("items.productId").populate("items.variantId");
};

const addToCartService = async (userId, productId, variantId, quantity = 1) => {
    const product = await productModel.findById(productId);
    if (!product) throw new Error("Product not found");

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

    if (currentCartQuantity + quantity > stockAvailable) {
         throw new Error(stockAvailable === 0 ? "This item is out of stock" : `Only ${stockAvailable} units available`);
    }

    if (!cart) {
        cart = new cartModel({ userId, items: [{ productId, variantId, quantity }] });
        return await cart.save();
    }

    const existingItemIndex = cart.items.findIndex(item => 
        item.productId.toString() === productId.toString() && 
        (!variantId || (item.variantId && item.variantId.toString() === variantId.toString()))
    );
    
    if (existingItemIndex > -1) {
        cart.items[existingItemIndex].quantity += quantity;
    } else {
        cart.items.push({ productId, variantId, quantity });
    }

    return await cart.save();
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

    const product = await productModel.findById(productId);
    if (!product || product.isDeleted || (product.status && product.status.toLowerCase() !== 'active')) {
        throw new Error("This product is currently unavailable");
    }

    if (product.quantity !== undefined && product.quantity !== null && quantity > product.quantity) {
        throw new Error(product.quantity === 0 ? "Product is out of stock" : `Only ${product.quantity} units available in stock`);
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

module.exports = {
    getCartService,
    addToCartService,
    removeFromCartService,
    updateCartQuantityService,
    clearCartService
};
