import { MESSAGES } from '../../utils/messages.js';
import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import variantModel from '../models/variants.js';
import categoryModel from '../models/categoryModel.js';
import { attachEffectiveOffer } from '../utils/offerPricing.js';

const getProductDetailsByIdService = async (productId) => {
    const product = await productModel.findById(productId)
        .populate('offerId')
        .populate({
            path: 'categoryId',
            populate: { path: 'offerId' }
        });
    if (!product || product.isDeleted) {
        throw new Error(MESSAGES.PRODUCT_NOT_FOUND);
    }
    
    const category = product.categoryId;
    if (!category || !category.isListed) {
        throw new Error("Product category is unavailable");
    }
    
    const variants = await variantModel.find({ productId: product._id, isDeleted: false });
        const productObj = attachEffectiveOffer(product);
        const totalStock = variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
        productObj.totalStock = totalStock;
        productObj.variants = variants;
        return productObj;
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
            isDeleted: false
        })
            .limit(4)
            .populate('offerId')
            .populate({
                path: 'categoryId',
                populate: { path: 'offerId' }
            });

        return relatedProducts.map(product => attachEffectiveOffer(product));
    } catch (error) {
        console.error('Error fetching related products:', error);
        return [];
    }
};

const getShopProductsService = async (filters = {}, page = 1) => {
    const itemsPerPage = 3;
    const skip = (page - 1) * itemsPerPage;

    const activeCategory = await categoryModel.find({ 
        isListed: { $ne: false }, 
        isDeleted: { $ne: true }, 
        isBlocked: { $ne: true } 
    }).select('_id');

    const activeCategoryIds = activeCategory.map(cat => cat._id);

    let query = {
        isDeleted: { $ne: true }, 
        categoryId: { $in: activeCategoryIds }
    };

    if (filters.category && filters.category.trim() !== '') {
        const selectedCategory = await categoryModel.findById(filters.category);
        if (!selectedCategory || selectedCategory.isListed === false || selectedCategory.isDeleted === true || selectedCategory.isBlocked === true) {
        } else {
            query.categoryId = filters.category;
        }
    }

    if (filters.search && filters.search.trim() !== '') {
        query.name = { $regex: filters.search.trim(), $options: 'i' };
    }



    if (filters.minPrice || filters.maxPrice) {
        const min = filters.minPrice ? Number(filters.minPrice) : 0;
        const max = filters.maxPrice ? Number(filters.maxPrice) : Infinity;

        const priceConditions = [];
        
        const offerPriceActiveQuery = {
            offerPrice: { $ne: null, $exists: true }
        };
        offerPriceActiveQuery.offerPrice = {};
        if (filters.minPrice) offerPriceActiveQuery.offerPrice.$gte = min;
        if (filters.maxPrice) offerPriceActiveQuery.offerPrice.$lte = max;
        priceConditions.push(offerPriceActiveQuery);

        const basePriceActiveQuery = {
            $or: [
                { offerPrice: null },
                { offerPrice: { $exists: false } }
            ]
        };
        basePriceActiveQuery.price = {};
        if (filters.minPrice) basePriceActiveQuery.price.$gte = min;
        if (filters.maxPrice) basePriceActiveQuery.price.$lte = max;
        priceConditions.push(basePriceActiveQuery);

        query.$and = query.$and || [];
        query.$and.push({ $or: priceConditions });
    }

    let sortOptions = { createdAt: -1 };
    if (filters.priceSort === 'lowToHigh') sortOptions = { price: 1 };
    if (filters.priceSort === 'highToLow') sortOptions = { price: -1 };

    const totalProducts = await productModel.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / itemsPerPage);

    const rawProducts = await productModel.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(itemsPerPage)
        .populate('offerId')
        .populate({
            path: 'categoryId',
            populate: { path: 'offerId' }
        });

    const products = await Promise.all(rawProducts.map(async (product) => {
        const variants = await variantModel.find({ productId: product._id, isDeleted: false });
        const productObj = attachEffectiveOffer(product);
        const totalStock = variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
        productObj.totalStock = totalStock;
        productObj.variants = variants;
        return productObj;
    }));

    return {
        products,
        currentPage: page,
        totalPages,
        totalProducts,
        itemsPerPage
    };
};

const getListedCategoriesService = async () => {
    return await categoryModel.find({ 
        isListed: { $ne: false }, 
        isDeleted: { $ne: true }, 
        isBlocked: { $ne: true } 
    }).sort({ name: 1 });
};

const getSearchSuggestionsService = async (searchTerm) => {
    const activeCategories = await categoryModel.find({ 
        isListed: { $ne: false }, 
        isDeleted: { $ne: true }, 
        isBlocked: { $ne: true } 
    }).select('_id');
    const activeCategoryIds = activeCategories.map(cat => cat._id);

    if (!searchTerm || searchTerm.trim() === '') {
        const latestProducts = await productModel.find({
            isDeleted: { $ne: true },
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
        isDeleted: { $ne: true },
        categoryId: { $in: activeCategoryIds }
    })
        .select('name')
        .limit(5);

    const categories = await categoryModel.find({
        name: { $regex: query, $options: 'i' },
        isListed: { $ne: false },
        isDeleted: { $ne: true },
        isBlocked: { $ne: true }
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
