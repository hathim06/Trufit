const orderService = require('../Services/orderService');

const applyCoupon = async (req, res) => {
    try {
        const { couponCode, cartTotal } = req.body;
        const applied = await orderService.applyCouponService(req.session.user, couponCode, cartTotal);
        res.status(200).json({ success: true, message: "Coupon applied successfully", coupon: applied });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const removeCoupon = async (req, res) => {
    try {
        await orderService.removeCouponService(req.session.user);
        res.status(200).json({ success: true, message: "Coupon removed successfully" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    applyCoupon,
    removeCoupon
};
