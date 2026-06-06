import colorService from '../Services/colorService.js';

const getColorsPage = async (req, res) => {
    try {
        const data = await colorService.getAllColorsService(req.query);
        res.render('admin/colors', { 
            colors: data.colors,
            currentPage: data.currentPage,
            totalPages: data.totalPages,
            status: req.query.status || 'all'
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

const softDeleteColor = async (req, res) => {
    try {
        await colorService.softDeleteColorService(req.params.id);
        res.json({ success: true, message: 'Color soft deleted successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const restoreColor = async (req, res) => {
    try {
        await colorService.restoreColorService(req.params.id);
        res.json({ success: true, message: 'Color restored successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const hardDeleteColor = async (req, res) => {
    try {
        await colorService.hardDeleteColorService(req.params.id);
        res.json({ success: true, message: 'Color permanently deleted' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const blockColor = async (req, res) => {
    try {
        await colorService.blockColorService(req.params.id);
        res.json({ success: true, message: 'Color blocked successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const unblockColor = async (req, res) => {
    try {
        await colorService.unblockColorService(req.params.id);
        res.json({ success: true, message: 'Color unblocked successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export default {
    getColorsPage,
    addColor,
    softDeleteColor,
    restoreColor,
    hardDeleteColor,
    blockColor,
    unblockColor
};
