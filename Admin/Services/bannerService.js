const mongoose = require('mongoose');
const bannerModel = require('../../User/models/bannerModel');
const cloudinary = require('../../Config/cloudinary');

const addBannerService = async (req) => {
    const { title, subtitle, link, order, image } = req.body;
    let imagePath = '';
    
    if (image && image.startsWith('data:image')) {
        // Handle cropped base64 image
        const result = await cloudinary.uploader.upload(image, {
            folder: 'banners'
        });
        imagePath = result.secure_url;
    } else if (req.file) {
        // Handle regular file upload (fallback)
        imagePath = req.file.path;
    } else {
        throw new Error('Banner image is required');
    }

    const newBanner = new bannerModel({
        title,
        subtitle,
        link,
        order: parseInt(order) || 0,
        image: imagePath
    });

    return await newBanner.save();
};

const getBannersService = async () => {
    return await bannerModel.find({ isDeleted: false }).sort({ order: 1, createdAt: -1 });
};

const getSingleBannerService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid Banner ID');
    const banner = await bannerModel.findById(id);
    if (!banner) throw new Error('Banner not found');
    return banner;
};

const updateBannerService = async (req) => {
    const { id } = req.params;
    const { title, subtitle, link, order, status, image } = req.body;
    
    const banner = await bannerModel.findById(id);
    if (!banner) throw new Error('Banner not found');

    banner.title = title;
    banner.subtitle = subtitle;
    banner.link = link;
    banner.order = parseInt(order) || 0;
    banner.status = status;

    if (image && image.startsWith('data:image')) {
        // Handle cropped base64 image
        const result = await cloudinary.uploader.upload(image, {
            folder: 'banners'
        });
        banner.image = result.secure_url;
    } else if (req.file) {
        // Handle regular file upload
        banner.image = req.file.path;
    }

    return await banner.save();
};

const toggleBannerStatusService = async (id) => {
    const banner = await bannerModel.findById(id);
    if (!banner) throw new Error('Banner not found');
    banner.status = banner.status === 'Active' ? 'Inactive' : 'Active';
    return await banner.save();
};

const deleteBannerService = async (id) => {
    const banner = await bannerModel.findById(id);
    if (!banner) throw new Error('Banner not found');
    banner.isDeleted = true;
    return await banner.save();
};

module.exports = {
    addBannerService,
    getBannersService,
    getSingleBannerService,
    updateBannerService,
    toggleBannerStatusService,
    deleteBannerService
};
