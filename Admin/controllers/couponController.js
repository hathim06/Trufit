const couponService = require('../Services/couponService');

const getCoupons = async (req, res) => {
    try {
        const data = await couponService.getCouponsService(req.query);
        res.render('admin/coupons', {
            ...data,
            success: req.query.success,
            message: req.query.message
        });
    } catch (error) {
        res.redirect('/admin/dashboard');
    }
};

const loadAddCoupon = async (req, res) => {
    res.render('admin/add-coupon', { message: null });
};

const addCoupon = async (req, res) => {
    try {
        await couponService.addCouponService(req.body);
        res.redirect('/admin/coupons?success=Coupon added successfully');
    } catch (error) {
        res.render('admin/add-coupon', { message: error.message });
    }
};

const loadEditCoupon = async (req, res) => {
    try {
        const coupon = await couponService.getCouponByIdService(req.params.id);
        res.render('admin/edit-coupon', { coupon, message: null });
    } catch (error) {
        res.redirect('/admin/coupons');
    }
};

const updateCoupon = async (req, res) => {
    try {
        await couponService.updateCouponService(req.params.id, req.body);
        res.redirect('/admin/coupons?success=Coupon updated successfully');
    } catch (error) {
        const coupon = await couponService.getCouponByIdService(req.params.id);
        res.render('admin/edit-coupon', { coupon, message: error.message });
    }
};

const deleteCoupon = async (req, res) => {
    try {
        await couponService.deleteCouponService(req.params.id);
        res.json({ success: true, message: "Coupon deleted successfully" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

module.exports = {
    getCoupons,
    loadAddCoupon,
    addCoupon,
    loadEditCoupon,
    updateCoupon,
    deleteCoupon
};
