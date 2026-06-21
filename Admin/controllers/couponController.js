import couponModel from '../../User/models/couponModel.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';

export const getCoupons = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        const searchItem = req.query.search || '';
        const status = req.query.status || '';

        const query = {};
        if (searchItem) {
            query.couponCode = { $regex: searchItem, $options: 'i' };
        }
        if (status) {
            query.status = status;
        }
        const coupons = await couponModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCoupons = await couponModel.countDocuments(query);
        const totalPages = Math.ceil(totalCoupons / limit);

        res.render('admin/coupons', {
            coupons,
            currentPage: page,
            totalPages,
            searchItem,
            status,
            limit
        });
    } catch (error) {
        console.error('Get Coupons Error', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Error fetching coupons');
    }
};

export const loadAddCoupon = async (req, res) => {
    res.render('admin/add-coupon', { message: null });
};

export const addCoupon = async (req, res) => {
    try {
        const { couponCode, description, startDate,
            expiryDate, minPurchase, status, discount, maxUsage, perUserLimit } = req.body;

        const existing = await couponModel.findOne({ couponCode: couponCode.trim().toUpperCase() });
        if (existing) {
            return res.render('admin/add-coupon', { message: 'A coupon with this code already exists.' });
        }

        const coupon = new couponModel({
            couponCode: couponCode.trim().toUpperCase(),
            description,
            startDate,
            expiryDate,
            minPurchase: parseFloat(minPurchase),
            status,
            discountPercentage: parseFloat(discount),
            maxUsage: parseInt(maxUsage, 10) || 100,
            perUserLimit: parseInt(perUserLimit, 10) || 1
        });

        await coupon.save();
        res.redirect('/admin/coupons');
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.render('admin/add-coupon', { message: 'Failed to add coupon. Please try again.' });
    }
};

export const loadEditCoupon = async (req, res) => {
    try {
        const coupon = await couponModel.findById(req.params.id);
        if (!coupon) {
            return res.redirect('/admin/coupons');
        }
        res.render('admin/edit-coupon', { coupon, message: null });
    } catch (error) {
        console.error('Error loading edit coupon:', error);
        res.redirect('/admin/coupons');
    }
};

export const updateCoupon = async (req, res) => {
    try {
        const { couponCode, description, startDate, expiryDate, minPurchase,
            status, discount, maxUsage, perUserLimit } = req.body;
        const couponId = req.params.id;

        const existing = await couponModel.findOne({
            couponCode: couponCode.trim().toUpperCase(),
            _id: { $ne: couponId }
        });
        if (existing) {
            const coupon = await couponModel.findById(couponId);
            return res.render('admin/edit-coupon', { coupon, message: 'A coupon with this code already exists.' });
        }

        await couponModel.findByIdAndUpdate(couponId, {
            couponCode: couponCode.trim().toUpperCase(),
            description,
            startDate,
            expiryDate,
            minPurchase: parseFloat(minPurchase),
            status,
            discountPercentage: parseFloat(discount),
            maxUsage: parseInt(maxUsage, 10) || 100,
            perUserLimit: parseInt(perUserLimit, 10) || 1
        });

        res.redirect('/admin/coupons');
    } catch (error) {
        console.error('Error updating coupon:', error);
        const coupon = await couponModel.findById(req.params.id).catch(() => null);
        res.render('admin/edit-coupon', { coupon, message: 'Failed to update coupon. Please try again.' });
    }
};

export const deleteCoupon = async (req, res) => {
    try {
        await couponModel.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to delete coupon.' });
    }
};

export const toggleStatus = async (req, res) => {
    try {
        const couponId = req.params.id;
        const coupon = await couponModel.findById(couponId);
        if (!coupon) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Coupon not found.' });
        }
        coupon.status = coupon.status === 'Active' ? 'Inactive' : 'Active';
        await coupon.save();
        res.json({ success: true, status: coupon.status });
    } catch (error) {
        console.error('Error toggling status:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to toggle coupon status.' });
    }
};
