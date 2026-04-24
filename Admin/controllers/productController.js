const productService = require('../Services/productService');
const categoryService = require('../Services/categoryService');
const colorService = require('../Services/colorService');

const loadProductPage = async (req, res) => {
    try {
        const data = await productService.getProductsService(req.query);
        const categories = await categoryService.getCategoriesService();

        res.render('admin/products', {
            products: data.products,
            search: data.search,
            selectedCategory: req.query.category || '',
            currentPage: data.currentPage,
            totalPages: data.totalPages,
            totalUsers: data.totalUsers,
            limit: data.limit,
            categories: categories
        });
    } catch (error) {
        console.log("Load Product Page Error:", error);
        res.redirect('/admin/dashboard');
    }
};

const loadAddProduct = async (req, res) => {
    try {
        const categories = await categoryService.getCategoriesService();
        const colors = await colorService.getAllColorsService();
        res.render('admin/add-product', { categories, colors });
    } catch (error) {
        console.log(error);
        res.redirect('/admin/products');
    }
};

const loadEditProduct = async (req, res) => {
    try {
        const product = await productService.getSingleProductService(req.params.id);
        const categories = await categoryService.getCategoriesService();
        const variants = await productService.getVariantsByProductId(req.params.id);
        const colors = await colorService.getAllColorsService();
        res.render('admin/edit-product', { product, categories, variants, colors });
    } catch (error) {
        console.log(error);
        res.redirect('/admin/products');
    }
};

const addProduct = async (req, res) => {
    try {
        await productService.addProductService(req);
        res.redirect('/admin/products?success=Product added successfully');
    } catch (error) {
        console.error("Add Product Error:", error.message);
        res.redirect('/admin/add-product?error=' + encodeURIComponent(error.message));
    }
};

const updateProduct = async (req, res) => {
    try {
        await productService.updateProductService(req);
        res.redirect('/admin/products?success=Product updated successfully');
    } catch (error) {
        console.error("Update Product Error:", error.message);
        res.redirect('/admin/products?error=' + encodeURIComponent(error.message));
    }
};

const deleteProduct = async (req, res) => {
    try {
        await productService.deleteProductService(req.params.id);
        res.status(200).json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
        console.error("Delete Product Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to delete product" });
    }
};

const addVariant = async (req, res) => {
    try {
        const { productId } = req.params;
        const variantData = req.body;
        const imageFiles = req.files;

        if (!imageFiles || imageFiles.length === 0) {
            return res.json({ success: false, message: 'At least one image is required' });
        }

        const variant = await productService.addVariantService(productId, variantData, imageFiles);
        res.json({ success: true, message: 'Variant added successfully', variant });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const updateVariant = async (req, res) => {
    try {
        const { variantId } = req.params;
        const variantData = req.body;
        const imageFiles = req.files;

        const variant = await productService.updateVariantService(variantId, variantData, imageFiles);
        res.json({ success: true, message: 'Variant updated successfully', variant });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const deleteVariant = async (req, res) => {
    try {
        const { variantId } = req.params;
        await productService.deleteVariantService(variantId);
        res.json({ success: true, message: 'Variant deleted successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const blockProduct = async (req, res) => {
    try {
        await productService.blockProductService(req.params.id);
        res.json({ success: true, message: "Product blocked successfully" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const unblockProduct = async (req, res) => {
    try {
        await productService.unblockProductService(req.params.id);
        res.json({ success: true, message: "Product unblocked successfully" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    loadProductPage,
    loadAddProduct,
    loadEditProduct,
    addProduct,
    updateProduct,
    deleteProduct,
    addVariant,
    updateVariant,
    deleteVariant,
    blockProduct,
    unblockProduct
};
