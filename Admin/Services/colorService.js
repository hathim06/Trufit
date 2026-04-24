const Color = require('../../User/models/colorModel');

const getAllColorsService = async () => {
    return await Color.find().sort({ createdAt: -1 });
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
