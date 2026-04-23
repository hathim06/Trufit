const mongoose = require('mongoose');
const productModel = require('../models/productModel');
const variantModel = require('../models/variants');
const categoryModel = require('../models/categoryModel');

const getProductDetailsByIdService = async (productId) => {
    const product = await productModel.findById(productId);
    if (!product || product.isDeleted || product.status !== 'Active') {
        throw new Error("Product not found");
    }
    return product;
};

const getVariantsByProductIdService = async (productId) => {
    return await variantModel.find({ productId, isDeleted: false });
};

const getRelatedProductsService = async (productId) => {
    try {
        const currentProduct = await productModel.findById(productId);
        if (!currentProduct) throw new Error("Product not found");

        const relatedProducts = await productModel.find({
            _id: { $ne: productId },
            categoryId: currentProduct.categoryId,
            isDeleted: false,
            status: 'Active'
        }).limit(4).populate('categoryId');

        return relatedProducts;
    } catch (error) {
        console.error('Error fetching related products:', error);
        return [];
    }
};

const getShopProductsService = async (filters = {}, page = 1) => {
    const itemsPerPage = 9;
    const skip = (page - 1) * itemsPerPage;
    
    let query = { isDeleted: false, status: 'Active' };

    if (filters.category && filters.category.trim() !== '') {
        query.categoryId = filters.category;
    }

    if (filters.size && filters.size.trim() !== '') {
        query.size = { $in: [filters.size] };
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
    if (!searchTerm || searchTerm.trim() === '') {
        const latestProducts = await productModel.find({
            isDeleted: false,
            status: 'Active'
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
        status: 'Active'
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

module.exports = {
    getProductDetailsByIdService,
    getVariantsByProductIdService,
    getRelatedProductsService,
    getShopProductsService,
    getListedCategoriesService,
    getSearchSuggestionsService
};