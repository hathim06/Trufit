const Color = require('../../User/models/colorModel');

const getAllColorsService = async (query = {}) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 5;
    const skip = (page - 1) * limit;

    const totalColors = await Color.countDocuments();
    const totalPages = Math.ceil(totalColors / limit);

    const colors = await Color.find()
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

const deleteColorService = async (id) => {
    return await Color.findByIdAndDelete(id);
};

module.exports = {
    getAllColorsService,
    addColorService,
    deleteColorService
};
