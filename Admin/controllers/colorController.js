const colorService = require('../Services/colorService');

const getColorsPage = async (req, res) => {
    try {
        const data = await colorService.getAllColorsService(req.query);
        res.render('admin/colors', { 
            colors: data.colors,
            currentPage: data.currentPage,
            totalPages: data.totalPages
        });
    } catch (error) {
        res.redirect('/admin/dashboard');
    }
};

const addColor = async (req, res) => {
    try {
        const { name, hex } = req.body;
        await colorService.addColorService(name, hex);
        res.json({ success: true, message: 'Color added successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const deleteColor = async (req, res) => {
    try {
        await colorService.deleteColorService(req.params.id);
        res.json({ success: true, message: 'Color deleted successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

module.exports = {
    getColorsPage,
    addColor,
    deleteColor
};
