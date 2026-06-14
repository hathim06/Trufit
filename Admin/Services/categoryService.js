import categoryModel from '../../User/models/categoryModel.js';

const getCategoriesService = async (search = '', page = 1, limit = 5, status = 'all') => {
    const query = {};
    if (status === 'deleted') {
        query.isDeleted = true;
    } else {
        query.isDeleted = { $ne: true };
        if (status === 'listed') query.isListed = true;
        else if (status === 'unlisted') query.isListed = false;
        else if (status === 'blocked') query.isBlocked = true;
    }

    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }

    const totalCategories = await categoryModel.countDocuments(query);
    const totalPages = Math.ceil(totalCategories / limit);
    const skip = (page - 1) * limit;

    const categories = await categoryModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return {
        categories,
        totalCategories,
        totalPages,
        currentPage: page
    };
};

const addCategoryService = async (data) => {
    const existing = await categoryModel.findOne({ name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') } });
    if (existing) throw new Error('Category already exists');
    return await categoryModel.create({
        name: data.name.trim(),
        description: data.description || '',
        offerId: data.offerId || null
    });
};

const getCategoryByIdService = async (id) => {
    const cat = await categoryModel.findById(id);
    if (!cat) throw new Error('Category not found');
    return cat;
};

const updateCategoryService = async (id, data) => {
    const newName = data.name.trim();
    const existing = await categoryModel.findOne({
        name: { $regex: new RegExp(`^${newName}$`, 'i') },
        _id: { $ne: id }
    });

    if (existing) throw new Error('Another category with this name already exists');

    const cat = await categoryModel.findById(id);
    if (!cat) throw new Error('Category not found');

    cat.name = newName;
    cat.description = data.description || '';
    cat.offerId = data.offerId || null;
    return await cat.save();
};

const toggleCategoryListingService = async (id) => {
    const cat = await categoryModel.findById(id);
    if (!cat) throw new Error('Category not found');
    cat.isListed = !cat.isListed;
    return await cat.save();
};

const softDeleteCategoryService = async (id) => {
    const cat = await categoryModel.findById(id);
    if (!cat) throw new Error('Category not found');
    cat.isDeleted = true;
    return await cat.save();
};

const restoreCategoryService = async (id) => {
    const cat = await categoryModel.findById(id);
    if (!cat) throw new Error('Category not found');
    cat.isDeleted = false;
    return await cat.save();
};

const hardDeleteCategoryService = async (id) => {
    await categoryModel.findByIdAndDelete(id);
};

const blockCategoryService = async (id) => {
    const cat = await categoryModel.findById(id);
    if (!cat) throw new Error('Category not found');
    cat.isBlocked = true;
    return await cat.save();
};

const unblockCategoryService = async (id) => {
    const cat = await categoryModel.findById(id);
    if (!cat) throw new Error('Category not found');
    cat.isBlocked = false;
    return await cat.save();
};

export default {
    getCategoriesService,
    addCategoryService,
    getCategoryByIdService,
    updateCategoryService,
    toggleCategoryListingService,
    softDeleteCategoryService,
    restoreCategoryService,
    hardDeleteCategoryService,
    blockCategoryService,
    unblockCategoryService
};
