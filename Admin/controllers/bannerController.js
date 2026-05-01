const bannerService = require('../Services/bannerService');

const loadBannerPage = async (req, res) => {
    try {
        const data = await bannerService.getBannersService(req.query);
        res.render('admin/banners', { 
            banners: data.banners,
            currentPage: data.currentPage,
            totalPages: data.totalPages,
            totalBanners: data.totalBanners,
            limit: data.limit
        });
    } catch (error) {
        console.error('Load Banners Error:', error);
        res.redirect('/admin/dashboard');
    }
};

const loadAddBanner = (req, res) => {
    res.render('admin/add-banner');
};

const addBanner = async (req, res) => {
    try {
        await bannerService.addBannerService(req);
        res.redirect('/admin/banners?success=Banner added successfully');
    } catch (error) {
        console.error('Add Banner Error:', error);
        res.redirect('/admin/add-banner?error=' + encodeURIComponent(error.message));
    }
};

const loadEditBanner = async (req, res) => {
    try {
        const banner = await bannerService.getSingleBannerService(req.params.id);
        res.render('admin/edit-banner', { banner });
    } catch (error) {
        console.error('Load Edit Banner Error:', error);
        res.redirect('/admin/banners');
    }
};

const updateBanner = async (req, res) => {
    try {
        await bannerService.updateBannerService(req);
        res.redirect('/admin/banners?success=Banner updated successfully');
    } catch (error) {
        console.error('Update Banner Error:', error);
        res.redirect('/admin/banners?error=' + encodeURIComponent(error.message));
    }
};

const toggleBannerStatus = async (req, res) => {
    try {
        await bannerService.toggleBannerStatusService(req.params.id);
        res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteBanner = async (req, res) => {
    try {
        await bannerService.deleteBannerService(req.params.id);
        res.json({ success: true, message: 'Banner deleted successfully' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    loadBannerPage,
    loadAddBanner,
    addBanner,
    loadEditBanner,
    updateBanner,
    toggleBannerStatus,
    deleteBanner
};
