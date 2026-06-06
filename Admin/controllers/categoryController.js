import categoryService from '../Services/categoryService.js';

const getCategories = async (req, res) => {
    try {
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const page = parseInt(req.query.page) || 1;
        const limit = 5;

        const { categories, totalPages, currentPage } = await categoryService.getCategoriesService(search, page, limit, status);
        
        res.render('admin/categories', {
            categories,
            totalPages,
            currentPage,
            search,
            status,
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

const softDeleteCategory = async (req, res) => {
    try {
        await categoryService.softDeleteCategoryService(req.params.id);
        res.json({ success: true, message: 'Category soft deleted successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const restoreCategory = async (req, res) => {
    try {
        await categoryService.restoreCategoryService(req.params.id);
        res.json({ success: true, message: 'Category restored successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const hardDeleteCategory = async (req, res) => {
    try {
        await categoryService.hardDeleteCategoryService(req.params.id);
        res.json({ success: true, message: 'Category permanently deleted' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const blockCategory = async (req, res) => {
    try {
        await categoryService.blockCategoryService(req.params.id);
        res.json({ success: true, message: 'Category blocked successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const unblockCategory = async (req, res) => {
    try {
        await categoryService.unblockCategoryService(req.params.id);
        res.json({ success: true, message: 'Category unblocked successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export default {
    getCategories,
    loadAddCategory,
    addCategory,
    loadEditCategory,
    updateCategory,
    toggleCategoryListing,
    softDeleteCategory,
    restoreCategory,
    hardDeleteCategory,
    blockCategory,
    unblockCategory
};
