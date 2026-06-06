import mongoose from 'mongoose';
import productModel from '../../User/models/productModel.js';
import variantModel from '../../User/models/variants.js';
import cartModel from '../../User/models/cartModel.js';
import wishlistModel from '../../User/models/wishlistModel.js';
import categoryModel from '../../User/models/categoryModel.js';

const syncProductWithVariants = async (productId) => {
    const variants = await variantModel.find({ productId, isDeleted: false, quantity: { $gt: 0 } });
    const uniqueSizes = [...new Set(variants.map(v => v.size))];
    const uniqueColors = [...new Set(variants.map(v => v.color))];
    const totalQuantity = variants.reduce((sum, v) => sum + v.quantity, 0);

    await productModel.findByIdAndUpdate(productId, {
        size: uniqueSizes,
        color: uniqueColors,
        quantity: totalQuantity
    });
};

const addProductService = async (req) => {
   
    if (!req.body.categoryId || req.body.categoryId.trim() === '') {
        throw new Error("Category is required");
    }

    if (!mongoose.Types.ObjectId.isValid(req.body.categoryId)) {
        throw new Error("Invalid category selected");
    }

    const imageUrls = [];
    if (req.files) {
        if (req.files.mainImage) imageUrls.push(req.files.mainImage[0].path);
        if (req.files.preview1) imageUrls.push(req.files.preview1[0].path);
        if (req.files.preview2) imageUrls.push(req.files.preview2[0].path);
        if (req.files.preview3) imageUrls.push(req.files.preview3[0].path);
    }

    const newProduct = new productModel({
        name: req.body.productName,
        categoryId: req.body.categoryId,
        offerId: req.body.offerId || null,
        showOnHomepage: req.body.showOnHomepage === 'Yes',
        status: req.body.status || 'Active',
        price: req.body.price,
        offerPrice: req.body.offerPrice || null,
        discount: req.body.discount || 0,
        quantity: req.body.quantity,
        size: req.body.size || 'M',
        color: req.body.color,
        image: imageUrls,
        description: req.body.description,
        isVerified: true,
        isDeleted: false
    });

    const product = await newProduct.save();

    let firstVariantImage = null;

    if (req.body.variantColor && Array.isArray(req.body.variantColor)) {
        const colorImagesMap = new Map();

        const uniqueColors = [...new Set(req.body.variantColor)];
        uniqueColors.forEach((color, colorIdx) => {
            const vNum = colorIdx + 1;
            const images = [];
            for (let imgIdx = 1; imgIdx <= 5; imgIdx++) {
                const fieldName = `v${vNum}_image${imgIdx}`;
                if (req.files && req.files[fieldName]) {
                    images.push(req.files[fieldName][0].path);
                }
            }
            if (images.length === 0 && req.files && req.files[`v${vNum}_image`]) {
                images.push(req.files[`v${vNum}_image`][0].path);
            }
            colorImagesMap.set(color, images);
        });


        for (let i = 0; i < req.body.variantColor.length; i++) {
            const color = req.body.variantColor[i];
            const size = req.body.variantSize ? req.body.variantSize[i] : 'M';
            const quantity = req.body.variantQuantity ? parseInt(req.body.variantQuantity[i]) : 0;

            if (color && color.trim() !== '' && quantity > 0) {
                const variantImages = colorImagesMap.get(color) || [];

                if (!firstVariantImage && variantImages.length > 0) firstVariantImage = variantImages[0];

                const finalImages = variantImages.length > 0 ? variantImages : (imageUrls.length > 0 ? imageUrls : []);

                const newVariant = new variantModel({
                    productId: product._id,
                    size: size,
                    color: color,
                    price: req.body.price,
                    quantity: quantity,
                    image: finalImages,
                    isVerified: true,
                    isDeleted: false
                });
                await newVariant.save();
            }
        }
    }

    if (product.image.length === 0 && firstVariantImage) {
        product.image = [firstVariantImage];
        await product.save();
    }

    await syncProductWithVariants(product._id);

    return product;
};

const getProductsService = async (query) => {
    const search = query.search || "";
    const category = query.category || "";
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 5;
    const skip = (page - 1) * limit;
    const status = query.status || "all";

    const filter = {
        name: { $regex: search, $options: "i" }
    };

    if (status === 'deleted') {
        filter.isDeleted = true;
    } else {
        filter.isDeleted = { $ne: true };
        if (status === 'active') filter.status = 'Active';
        if (status === 'blocked') filter.status = 'Blocked';
    }

    if (category && category !== "") {
        filter.categoryId = category;
    }

    const products = await productModel.find(filter)
        .populate('categoryId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const totalProducts = await productModel.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const totalProductsCount = await productModel.countDocuments({ isDeleted: { $ne: true } });
    const totalActiveProducts = await productModel.countDocuments({ isDeleted: { $ne: true }, status: 'Active' });
    const totalBlockedProducts = await productModel.countDocuments({ isDeleted: { $ne: true }, status: 'Blocked' });
    const totalDeletedProducts = await productModel.countDocuments({ isDeleted: true });

    return {
        products,
        search,
        status,
        currentPage: page,
        totalPages,
        limit,
        totalProducts: totalProductsCount,
        totalActiveProducts,
        totalBlockedProducts,
        totalDeletedProducts
    };
};

const getSingleProductService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid product ID");
    return await productModel.findById(id).populate('categoryId');
};

const updateProductService = async (req) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid product ID");

    if (!req.body.categoryId || req.body.categoryId.trim() === '') {
        throw new Error("Category is required");
    }

    const updateData = {
        name: req.body.productName,
        categoryId: req.body.categoryId,
        offerId: req.body.offerId || null,
        showOnHomepage: req.body.showOnHomepage === 'Yes',
        status: req.body.status,
        price: req.body.price,
        offerPrice: req.body.offerPrice || null,
        discount: req.body.discount || 0,
        quantity: req.body.quantity,
        description: req.body.description
    };

    const product = await productModel.findByIdAndUpdate(id, updateData, { new: true });

    if (req.body.variantColor && Array.isArray(req.body.variantColor)) {
        const submittedColors = req.body.variantColor;
        const submittedSizes = req.body.variantSize || [];
        const submittedQuantities = req.body.variantQuantity || [];

        const existingVariants = await variantModel.find({ productId: id, isDeleted: false });

        const colorImagesMap = new Map();
        const uniqueColors = [...new Set(submittedColors)];

        uniqueColors.forEach((color, colorIdx) => {
            const vNum = colorIdx + 1;
            const newImgs = [];
            for (let imgIdx = 1; imgIdx <= 5; imgIdx++) {
                const fieldName = `v${vNum}_image${imgIdx}`;
                if (req.files && req.files[fieldName]) {
                    newImgs.push(req.files[fieldName][0].path);
                }
            }
            colorImagesMap.set(color, newImgs);
        });

        let firstVariantImage = null;

        const processedVariantIds = [];

        for (let i = 0; i < submittedColors.length; i++) {
            const color = submittedColors[i];
            const size = submittedSizes[i] || 'M';
            const quantity = parseInt(submittedQuantities[i]) || 0;

            if (quantity <= 0) continue;

            const existing = existingVariants.find(v => v.color === color && v.size === size);
            const newImgs = colorImagesMap.get(color) || [];

            let finalImages = [];
            if (existing) {
                const existingImgs = [...existing.image];
                const colorVNum = uniqueColors.indexOf(color) + 1;
                for (let imgIdx = 0; imgIdx < 5; imgIdx++) {
                    const fieldName = `v${colorVNum}_image${imgIdx + 1}`;
                    const existingFieldName = `v${colorVNum}_existingImage${imgIdx + 1}`;
                    
                    if (req.files && req.files[fieldName]) {
                        finalImages[imgIdx] = req.files[fieldName][0].path;
                    } else if (req.body[existingFieldName]) {
                        finalImages[imgIdx] = existingImgs[imgIdx];
                    }
                }
                finalImages = finalImages.filter(img => !!img);
            } else {
                finalImages = colorImagesMap.get(color) || [];
            }

            if (!firstVariantImage && finalImages.length > 0) firstVariantImage = finalImages[0];

            if (existing) {
                existing.quantity = quantity;
                existing.image = finalImages;
                existing.price = req.body.price;
                await existing.save();
                processedVariantIds.push(existing._id.toString());
            } else {
                const newVariant = new variantModel({
                    productId: id,
                    size: size,
                    color: color,
                    price: req.body.price,
                    quantity: quantity,
                    image: finalImages,
                    isVerified: true,
                    isDeleted: false
                });
                const saved = await newVariant.save();
                processedVariantIds.push(saved._id.toString());
            }
        }

        for (const ev of existingVariants) {
            if (!processedVariantIds.includes(ev._id.toString())) {
                ev.isDeleted = true;
                await ev.save();
            }
        }

        if ((!product.image || product.image.length === 0) && firstVariantImage) {
            product.image = [firstVariantImage];
            await product.save();
        }
    }

    await syncProductWithVariants(id);

    return product;
};

const deleteProductService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid product ID");

    await cartModel.updateMany({ 'items.productId': id }, { $pull: { items: { productId: id } } });
    await wishlistModel.updateMany({ 'items.productId': id }, { $pull: { items: { productId: id } } });

    return await productModel.findByIdAndUpdate(id, { isDeleted: true });
};

const softDeleteProductService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid product ID");

    await cartModel.updateMany({ 'items.productId': id }, { $pull: { items: { productId: id } } });
    await wishlistModel.updateMany({ 'items.productId': id }, { $pull: { items: { productId: id } } });

    return await productModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
};

const restoreProductService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid product ID");
    return await productModel.findByIdAndUpdate(id, { isDeleted: false }, { new: true });
};

const hardDeleteProductService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid product ID");

    await cartModel.updateMany({ 'items.productId': id }, { $pull: { items: { productId: id } } });
    await wishlistModel.updateMany({ 'items.productId': id }, { $pull: { items: { productId: id } } });

    return await productModel.findByIdAndDelete(id);
};

const getVariantsByProductId = async (productId) => {
    return await variantModel.find({ productId, isDeleted: false });
};

const addVariantService = async (productId, variantData, imageFiles) => {
    const imagePaths = [];
    if (imageFiles && imageFiles.length > 0) {
        imageFiles.forEach(file => { if (file.path) imagePaths.push(file.path); });
    }

    const variant = new variantModel({
        productId,
        size: variantData.size,
        color: variantData.color,
        price: variantData.price,
        quantity: variantData.quantity,
        image: imagePaths,
        isVerified: true,
        isDeleted: false
    });

    const saved = await variant.save();
    await syncProductWithVariants(productId);
    return saved;
};

const updateVariantService = async (variantId, variantData, imageFiles) => {
    const variant = await variantModel.findById(variantId);
    if (!variant) throw new Error('Variant not found');

    variant.size = variantData.size;
    variant.color = variantData.color;
    variant.price = variantData.price;
    variant.quantity = variantData.quantity;

    if (imageFiles && imageFiles.length > 0) {
        variant.image = imageFiles.map(file => file.path).filter(p => !!p);
    }

    variant.updatedAt = new Date();
    const saved = await variant.save();
    await syncProductWithVariants(variant.productId);
    return saved;
};

const deleteVariantService = async (variantId) => {
    const variant = await variantModel.findByIdAndUpdate(variantId, { isDeleted: true });
    if (!variant) throw new Error('Variant not found');
    await syncProductWithVariants(variant.productId);
    return variant;
};

const blockProductService = async (id) => {
    return await productModel.findByIdAndUpdate(id, { status: 'Blocked' }, { new: true });
};

const unblockProductService = async (id) => {
    return await productModel.findByIdAndUpdate(id, { status: 'Active' }, { new: true });
};

export default {
    addProductService,
    getProductsService,
    getSingleProductService,
    updateProductService,
    deleteProductService,
    softDeleteProductService,
    restoreProductService,
    hardDeleteProductService,
    getVariantsByProductId,
    addVariantService,
    updateVariantService,
    deleteVariantService,
    blockProductService,
    unblockProductService
};
