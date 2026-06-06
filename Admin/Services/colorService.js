import Color from '../../User/models/colorModel.js';

const getAllColorsService = async (query = {}) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 5;
    const skip = (page - 1) * limit;
    const status = query.status || 'all';

    const filter = {};
    if (status === 'deleted') {
        filter.isDeleted = true;
    } else {
        filter.isDeleted = { $ne: true };
        if (status === 'blocked') filter.isBlocked = true;
    }

    const totalColors = await Color.countDocuments(filter);
    const totalPages = Math.ceil(totalColors / limit);

    const colors = await Color.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return {
        colors,
        currentPage: page,
        totalPages,
        totalColors,
        limit
    };
};

const addColorService = async (name, hex) => {
    const existing = await Color.findOne({
        $or: [
            { name: { $regex: new RegExp(`^${name}$`, 'i') } },
            { hex: { $regex: new RegExp(`^${hex}$`, 'i') } }
        ]
    });

    if (existing) {
        throw new Error('Color name or Hex code already exists');
    }

    return await Color.create({ name, hex });
};

const softDeleteColorService = async (id) => {
    const color = await Color.findById(id);
    if (!color) throw new Error('Color not found');
    color.isDeleted = true;
    return await color.save();
};

const restoreColorService = async (id) => {
    const color = await Color.findById(id);
    if (!color) throw new Error('Color not found');
    color.isDeleted = false;
    return await color.save();
};

const hardDeleteColorService = async (id) => {
    return await Color.findByIdAndDelete(id);
};

const blockColorService = async (id) => {
    const color = await Color.findById(id);
    if (!color) throw new Error('Color not found');
    color.isBlocked = true;
    return await color.save();
};

const unblockColorService = async (id) => {
    const color = await Color.findById(id);
    if (!color) throw new Error('Color not found');
    color.isBlocked = false;
    return await color.save();
};

export default {
    getAllColorsService,
    addColorService,
    softDeleteColorService,
    restoreColorService,
    hardDeleteColorService,
    blockColorService,
    unblockColorService
};
