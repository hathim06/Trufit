const categoryService = require('../Services/categoryService');

const getCategories = async (req, res) => {
    try {
        const categories = await categoryService.getCategoriesService();
        res.render('admin/categories', {
            categories,
            success: req.query.success,
            message: req.query.message
        });
    } catch (error) {
        res.redirect('/admin/dashboard');
    }
};

const loadAddCategory = async (req, res) => {
    res.render('admin/add-category', { message: null });
};

const addCategory = async (req, res) => {
    try {
        await categoryService.addCategoryService(req.body);
        res.redirect('/admin/categories?success=Category added successfully');
    } catch (error) {
        res.render('admin/add-category', { message: error.message });
    }
};

const loadEditCategory = async (req, res) => {
    try {
        const category = await categoryService.getCategoryByIdService(req.params.id);
        res.render('admin/edit-category', { category, message: null });
    } catch (error) {
        res.redirect('/admin/categories');
    }
};

const updateCategory = async (req, res) => {
    try {
        await categoryService.updateCategoryService(req.params.id, req.body);
        res.redirect('/admin/categories?success=Category updated successfully');
    } catch (error) {
        const category = { _id: req.params.id, name: req.body.name, description: req.body.description };
        res.render('admin/edit-category', { category, message: error.message });
    }
};

const toggleCategoryListing = async (req, res) => {
    try {
        await categoryService.toggleCategoryListingService(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        await categoryService.deleteCategoryService(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

module.exports = {
    getCategories,
    loadAddCategory,
    addCategory,
    loadEditCategory,
    updateCategory,
    toggleCategoryListing,
    deleteCategory
};
