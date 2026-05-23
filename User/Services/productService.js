import { MESSAGES } from '../../utils/messages.js';
import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import variantModel from '../models/variants.js';
import categoryModel from '../models/categoryModel.js';

const getProductDetailsByIdService = async (productId) => {
    const product = await productModel.findById(productId);
    if (!product || product.isDeleted || (product.status && product.status.toLowerCase() !== 'active')) {
        throw new Error(MESSAGES.PRODUCT_NOT_FOUND);
    }
    
    // Check if category is listed
    const category = await categoryModel.findById(product.categoryId);
    if (!category || !category.isListed) {
        throw new Error("Product category is unavailable");
    }
    
    return product;
};

const getVariantsByProductIdService = async (productId) => {
    return await variantModel.find({ productId, isDeleted: false });
};

const getRelatedProductsService = async (productId) => {
    try {
        const currentProduct = await productModel.findById(productId);
        if (!currentProduct) throw new Error(MESSAGES.PRODUCT_NOT_FOUND);

        const category = await categoryModel.findById(currentProduct.categoryId);
        if (!category || !category.isListed) return [];

        const relatedProducts = await productModel.find({
            _id: { $ne: productId },
            categoryId: currentProduct.categoryId,
            isDeleted: false,
            status: { $regex: /^active$/i }
        }).limit(4).populate('categoryId');

        return relatedProducts;
    } catch (error) {
        console.error('Error fetching related products:', error);
        return [];
    }
};

const getShopProductsService = async (filters = {}, page = 1) => {
    const itemsPerPage = 3;
    const skip = (page - 1) * itemsPerPage;

    const activeCategory = await categoryModel.find({ isListed: true }).select('_id');

    const activeCategoryIds = activeCategory.map(cat => cat._id);

    let query = {
        isDeleted: false, status: { $regex: /^active$/i },
        categoryId: { $in: activeCategoryIds }
    };

    if (filters.category && filters.category.trim() !== '') {
        query.categoryId = filters.category;
    }

    if (filters.search && filters.search.trim() !== '') {
        query.name = { $regex: filters.search.trim(), $options: 'i' };
    }

    if (filters.size && filters.size.trim() !== '') {
        const productIdsWithSelectedSize = await variantModel.find({
            size: filters.size,
            isDeleted: false,
            quantity: { $gt: 0 }
        }).distinct('productId');

        query.$or = [
            { _id: { $in: productIdsWithSelectedSize } },
            { size: filters.size }
        ];
    }

    if (filters.minPrice || filters.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
        if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
    }

    let sortOptions = { createdAt: -1 };
    if (filters.priceSort === 'lowToHigh') sortOptions = { price: 1 };
    if (filters.priceSort === 'highToLow') sortOptions = { price: -1 };

    const totalProducts = await productModel.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / itemsPerPage);

    const products = await productModel.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(itemsPerPage)
        .populate('categoryId');

    return {
        products,
        currentPage: page,
        totalPages,
        totalProducts,
        itemsPerPage
    };
};

const getListedCategoriesService = async () => {
    return await categoryModel.find({ isListed: true }).sort({ name: 1 });
};

const getSearchSuggestionsService = async (searchTerm) => {
    const activeCategories = await categoryModel.find({ isListed: true }).select('_id');
    const activeCategoryIds = activeCategories.map(cat => cat._id);

    if (!searchTerm || searchTerm.trim() === '') {
        const latestProducts = await productModel.find({
            isDeleted: false,
            status: { $regex: /^active$/i },
            categoryId: { $in: activeCategoryIds }
        })
            .select('name')
            .sort({ createdAt: -1 })
            .limit(8);

        return latestProducts.map(p => ({
            name: p.name,
            type: 'product',
            _id: p._id
        }));
    }

    const query = searchTerm.trim();

    const products = await productModel.find({
        name: { $regex: query, $options: 'i' },
        isDeleted: false,
        status: { $regex: /^active$/i },
        categoryId: { $in: activeCategoryIds }
    })
        .select('name')
        .limit(5);

    const categories = await categoryModel.find({
        name: { $regex: query, $options: 'i' },
        isListed: true
    })
        .select('name')
        .limit(3);

    const results = [
        ...products.map(p => ({ name: p.name, type: 'product', _id: p._id })),
        ...categories.map(c => ({ name: c.name, type: 'category', _id: c._id }))
    ];

    return results;
};

export default {
    getProductDetailsByIdService,
    getVariantsByProductIdService,
    getRelatedProductsService,
    getShopProductsService,
    getListedCategoriesService,
    getSearchSuggestionsService
};