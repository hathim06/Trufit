const mongoose = require('mongoose');
const productModel = require('../models/productModel');

const addProductService = async (req) => {
    const imageUrls = [];
    if (req.files) {
        if (req.files.mainImage) imageUrls.push(req.files.mainImage[0].path);
        if (req.files.preview1) imageUrls.push(req.files.preview1[0].path);
        if (req.files.preview2) imageUrls.push(req.files.preview2[0].path);
        if (req.files.preview3) imageUrls.push(req.files.preview3[0].path);
    }

    if (imageUrls.length === 0) {
        throw new Error("Main product image is required.");
    }

    const categoryId = mongoose.Types.ObjectId.isValid(req.body.categoryId)
        ? req.body.categoryId
        : undefined;

    const offerId = mongoose.Types.ObjectId.isValid(req.body.offerId)
        ? req.body.offerId
        : undefined;

    const newProduct = new productModel({
        name: req.body.productName,
        categoryId,
        offerId,
        showOnHomepage: req.body.showOnHomepage === 'Yes',
        status: req.body.status || 'Active',
        price: req.body.price,
        quantity: req.body.quantity,
        size: req.body.size || 'M',
        color: req.body.color,
        image: imageUrls,
        description: req.body.description,
        isVerified: true,
        isDeleted: false
    });

    return await newProduct.save();
};

const getProductsService = async (queryParams) => {
    const search = queryParams.search || "";
    const page = parseInt(queryParams.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const query = {
        isDeleted: false,
        $or: [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ]
    };

    const totalUsers = await productModel.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    const products = await productModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return {
        products,
        search,
        currentPage: page,
        totalPages,
        totalUsers,
        limit
    };
};

const getSingleProductService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid product ID");
    }

    const product = await productModel.findById(id);

    if (!product) {
        throw new Error("Product not found");
    }

    return product;
};

const updateProductService = async (req) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid product ID");
    }

    const updateData = {
        name: req.body.productName,
        categoryId: req.body.categoryId,
        offerId: req.body.offerId,
        showOnHomepage: req.body.showOnHomepage === 'Yes',
        status: req.body.status,
        price: req.body.price,
        quantity: req.body.quantity,
        size: req.body.size,
        color: req.body.color,
        description: req.body.description
    };

    const newImages = [];
    if (req.files) {
        if (req.files.mainImage) newImages.push(req.files.mainImage[0].path);
        if (req.files.preview1) newImages.push(req.files.preview1[0].path);
        if (req.files.preview2) newImages.push(req.files.preview2[0].path);
        if (req.files.preview3) newImages.push(req.files.preview3[0].path);
    }

    if (newImages.length > 0) {
        updateData.image = newImages;
    }

    return await productModel.findByIdAndUpdate(id, updateData, { new: true });
};

const deleteProductService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid product ID");
    }

    return await productModel.findByIdAndUpdate(id, { isDeleted: true });
};


module.exports = {
    addProductService,
    getProductsService,
    getSingleProductService,
    updateProductService,
    deleteProductService,
};