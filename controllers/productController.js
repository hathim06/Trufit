const productService = require('../Services/productService');
const mongoose = require('mongoose');
const productModel = require('../models/productModel');

const addProduct = async (req, res) => {
    try {
        await productService.addProductService(req);
        res.redirect('/admin/products?success=Product added successfully');
    } catch (error) {
        console.error("Add Product Error:", error.message);
        res.redirect('/admin/add-product?error=' + encodeURIComponent(error.message));
    }
};

const loadProductPage = async (req, res) => {
    try {
        const data = await productService.getProductsService(req.query);

        res.render('admin/products', {
            products: data.products,
            search: data.search,
            currentPage: data.currentPage,
            totalPages: data.totalPages,
            totalUsers: data.totalUsers,
            limit: data.limit
        });
    } catch (error) {
        console.log("Load Product Page Error:", error);
        res.redirect('/admin/dashboard');
    }
};

const loadAddProduct = async (req, res) => {
    try {
        res.render('admin/add-product');
    } catch (error) {
        console.log(error);
        res.redirect('/admin/products');
    }
};

const loadEditProduct = async (req, res) => {
    try {
        const product = await productService.getSingleProductService(req.params.id);
        res.render('admin/edit-product', { product });
    } catch (error) {
        console.log(error);
        res.redirect('/admin/products');
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


module.exports = {
    loadProductPage,
    loadAddProduct,
    loadEditProduct,
    addProduct,
    updateProduct,
    deleteProduct
};