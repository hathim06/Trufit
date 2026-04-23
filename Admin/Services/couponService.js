const couponModel = require('../../User/models/couponModel');

const getCouponsService = async (queryParams) => {
    const search = queryParams.search || "";
    const page = parseInt(queryParams.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = {
        isDeleted: false,
        $or: [
            { couponCode: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ]
    };

    const totalCoupons = await couponModel.countDocuments(query);
    const totalPages = Math.ceil(totalCoupons / limit);

    const coupons = await couponModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return {
        coupons,
        searchTerm: search,
        currentPage: page,
        totalPages,
        totalCoupons,
        limit
    };
};

const addCouponService = async (data) => {
    const existing = await couponModel.findOne({ couponCode: data.couponCode.toUpperCase() });
    if (existing) throw new Error('Coupon code already exists');

    return await couponModel.create({
        couponCode: data.couponCode.toUpperCase().trim(),
        description: data.description.trim(),
        discountPercentage: data.discount,
        minPurchase: data.minPurchase,
        startDate: new Date(data.startDate),
        expiryDate: new Date(data.expiryDate),
        status: data.status
    });
};

const getCouponByIdService = async (id) => {
    const coupon = await couponModel.findById(id);
    if (!coupon) throw new Error('Coupon not found');
    return coupon;
};

const updateCouponService = async (id, data) => {
    const existing = await couponModel.findOne({ couponCode: data.couponCode.toUpperCase(), _id: { $ne: id } });
    if (existing) throw new Error('Coupon code already exists');

    return await couponModel.findByIdAndUpdate(id, {
        couponCode: data.couponCode.toUpperCase().trim(),
        description: data.description.trim(),
        discountPercentage: data.discount,
        minPurchase: data.minPurchase,
        startDate: new Date(data.startDate),
        expiryDate: new Date(data.expiryDate),
        status: data.status,
        updatedAt: new Date()
    }, { new: true });
};

const deleteCouponService = async (id) => {
    return await couponModel.findByIdAndUpdate(id, { isDeleted: true });
};

module.exports = {
    getCouponsService,
    addCouponService,
    getCouponByIdService,
    updateCouponService,
    deleteCouponService
};
