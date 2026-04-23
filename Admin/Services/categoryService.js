const categoryModel = require('../../User/models/categoryModel');

const getCategoriesService = async () => {
    return await categoryModel.find().sort({ createdAt: -1 });
};

const addCategoryService = async (data) => {
    const existing = await categoryModel.findOne({ name: { $regex: new RegExp(`^${data.name}$`, 'i') } });
    if (existing) throw new Error('Category already exists');
    return await categoryModel.create({
        name: data.name.trim(),
        description: data.description || ''
    });
};

const getCategoryByIdService = async (id) => {
    const cat = await categoryModel.findById(id);
    if (!cat) throw new Error('Category not found');
    return cat;
};

const updateCategoryService = async (id, data) => {
    const cat = await categoryModel.findById(id);
    if (!cat) throw new Error('Category not found');
    cat.name = data.name.trim();
    cat.description = data.description || '';
    return await cat.save();
};

const toggleCategoryListingService = async (id) => {
    const cat = await categoryModel.findById(id);
    if (!cat) throw new Error('Category not found');
    cat.isListed = !cat.isListed;
    return await cat.save();
};

const deleteCategoryService = async (id) => {
    await categoryModel.findByIdAndDelete(id);
};

module.exports = {
    getCategoriesService,
    addCategoryService,
    getCategoryByIdService,
    updateCategoryService,
    toggleCategoryListingService,
    deleteCategoryService
};
