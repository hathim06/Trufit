import couponModel from '../../User/models/couponModel.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';

const buildCouponPayload = (body) => ({
    couponCode: String(body.couponCode || '').trim().toUpperCase(),
    description: String(body.description || '').trim(),
    startDate: body.startDate,
    expiryDate: body.expiryDate,
    minPurchase: Number(body.minPurchase),
    status: body.status || 'Active',
    discountPercentage: Number(body.discount),
    maxDiscountAmount: Number(body.maxDiscountAmount),
    maxUsage: Number.parseInt(body.maxUsage, 10),
    perUserLimit: Number.parseInt(body.perUserLimit, 10)
});

const validateCouponPayload = (payload) => {
    const errors = [];
    const codePattern = /^[A-Z0-9_-]{3,20}$/;
    const start = new Date(payload.startDate);
    const end = new Date(payload.expiryDate);

    if (!codePattern.test(payload.couponCode)) errors.push('Coupon code must be 3-20 characters using letters, numbers, hyphen, or underscore.');
    if (payload.description.length < 5 || payload.description.length > 200) errors.push('Description must be between 5 and 200 characters.');
    if (!payload.startDate || Number.isNaN(start.getTime())) errors.push('Start date is required.');
    if (!payload.expiryDate || Number.isNaN(end.getTime())) errors.push('Expiry date is required.');
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) errors.push('Expiry date must be on or after the start date.');
    if (!Number.isFinite(payload.minPurchase) || payload.minPurchase < 0) errors.push('Minimum purchase must be zero or greater.');
    if (!Number.isFinite(payload.discountPercentage) || payload.discountPercentage <= 0 || payload.discountPercentage > 90) errors.push('Discount percentage must be between 1 and 90.');
    if (!Number.isFinite(payload.maxDiscountAmount) || payload.maxDiscountAmount <= 0) errors.push('Maximum discount amount must be greater than zero.');
    if (payload.minPurchase < payload.maxDiscountAmount) errors.push('Minimum purchase must be greater than or equal to the maximum discount amount.');
    if (!Number.isInteger(payload.maxUsage) || payload.maxUsage < 1) errors.push('Total coupons available must be at least 1.');
    if (!Number.isInteger(payload.perUserLimit) || payload.perUserLimit < 1) errors.push('Per user limit must be at least 1.');
    if (Number.isInteger(payload.maxUsage) && Number.isInteger(payload.perUserLimit) && payload.perUserLimit > payload.maxUsage) errors.push('Per user limit cannot exceed total coupons available.');
    if (!['Active', 'Expired', 'Inactive'].includes(payload.status)) errors.push('Invalid coupon status.');

    return errors;
};

const renderCouponForm = (res, view, data) => {
    res.render(view, {
        message: data.errors && data.errors.length ? data.errors.join(' ') : null,
        errors: data.errors || [],
        coupon: data.coupon || null,
        formData: data.formData || {}
    });
};

export const getCoupons = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        const searchItem = req.query.search || '';
        const status = req.query.status || '';

        const query = {};
        if (searchItem) query.couponCode = { $regex: searchItem, $options: 'i' };
        if (status) query.status = status;

        const coupons = await couponModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const couponsWithUsage = coupons.map(coupon => {
            const usedCount = Number(coupon.usageCount) || 0;
            const maxUsageCount = Number(coupon.maxUsage) || 0;
            return {
                ...coupon.toObject(),
                usedCount,
                maxUsageCount,
                availableCount: Math.max(maxUsageCount - usedCount, 0)
            };
        });

        const totalCoupons = await couponModel.countDocuments(query);
        const totalPages = Math.ceil(totalCoupons / limit);

        res.render('admin/coupons', {
            coupons: couponsWithUsage,
            currentPage: page,
            totalPages,
            searchItem,
            searchTerm: searchItem,
            status,
            limit
        });
    } catch (error) {
        console.error('Get Coupons Error', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Error fetching coupons');
    }
};

export const loadAddCoupon = async (req, res) => {
    res.render('admin/add-coupon', { message: null, errors: [], formData: {} });
};

export const addCoupon = async (req, res) => {
    try {
        const payload = buildCouponPayload(req.body);
        const errors = validateCouponPayload(payload);

        const existing = payload.couponCode
            ? await couponModel.findOne({ couponCode: payload.couponCode })
            : null;
        if (existing) errors.push('A coupon with this code already exists.');

        if (errors.length > 0) {
            return renderCouponForm(res, 'admin/add-coupon', { errors, formData: req.body });
        }

        await couponModel.create(payload);
        res.redirect('/admin/coupons?success=Coupon added successfully');
    } catch (error) {
        console.error('Error adding coupon:', error);
        renderCouponForm(res, 'admin/add-coupon', { errors: ['Failed to add coupon. Please try again.'], formData: req.body });
    }
};

export const loadEditCoupon = async (req, res) => {
    try {
        const coupon = await couponModel.findById(req.params.id);
        if (!coupon) return res.redirect('/admin/coupons');
        res.render('admin/edit-coupon', { coupon, message: null, errors: [], formData: {} });
    } catch (error) {
        console.error('Error loading edit coupon:', error);
        res.redirect('/admin/coupons');
    }
};

export const updateCoupon = async (req, res) => {
    const couponId = req.params.id;
    try {
        const payload = buildCouponPayload(req.body);
        const errors = validateCouponPayload(payload);

        const existing = payload.couponCode
            ? await couponModel.findOne({ couponCode: payload.couponCode, _id: { $ne: couponId } })
            : null;
        if (existing) errors.push('A coupon with this code already exists.');

        if (errors.length > 0) {
            const coupon = await couponModel.findById(couponId);
            return renderCouponForm(res, 'admin/edit-coupon', { coupon, errors, formData: req.body });
        }

        await couponModel.findByIdAndUpdate(couponId, payload, { runValidators: true });
        res.redirect('/admin/coupons?success=Coupon updated successfully');
    } catch (error) {
        console.error('Error updating coupon:', error);
        const coupon = await couponModel.findById(couponId).catch(() => null);
        renderCouponForm(res, 'admin/edit-coupon', { coupon, errors: ['Failed to update coupon. Please try again.'], formData: req.body });
    }
};

export const deleteCoupon = async (req, res) => {
    try {
        const deletedCoupon = await couponModel.findByIdAndDelete(req.params.id);
        if (!deletedCoupon) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Coupon not found.' });
        }
        res.json({ success: true, message: 'Coupon deleted successfully.' });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to delete coupon.' });
    }
};

export const toggleStatus = async (req, res) => {
    try {
        const coupon = await couponModel.findById(req.params.id);
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
