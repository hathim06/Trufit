const orderService = require('../Services/orderService');
const userService = require('../Services/userService');
const cartService = require('../Services/cartService');

const loadCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        const addresses = await userService.getAddressService(userId);
        const cart = await cartService.getCartService(userId);

        if (!cart || cart.items.length === 0) {
            return res.redirect('/cart');
        }

        let subtotal = 0;
        cart.items.forEach(item => {
            const price = item.variantId ? item.variantId.price : item.productId.price;
            subtotal += price * item.quantity;
        });

        const discountAmount = Math.round((subtotal * (cart.appliedCoupon.discountPercentage || 0)) / 100);
        const total = subtotal - discountAmount;

        res.render('users/checkout', {
            user: req.session.user,
            addresses,
            cartItems: cart.items,
            appliedCoupon: cart.appliedCoupon,
            subtotal,
            discountAmount,
            total
        });
    } catch (error) {
        console.error('Load checkout error:', error);
        res.redirect('/cart');
    }
};

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressId, paymentMethod } = req.body;

        const result = await orderService.placeOrderService(userId, { addressId, paymentMethod });
        res.status(200).json({ success: true, message: "Order placed successfully", orderId: result._id });
    } catch (error) {
        console.error('Place order error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const loadOrders = async (req, res) => {
    try {
        const userId = req.session.user;
        const orders = await orderService.getUserOrdersService(userId);
        res.render('users/orders', {
            activePage: 'orders',
            orders
        });
    } catch (error) {
        console.error('Load orders error:', error);
        res.redirect('/profile');
    }
};

const loadOrderDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.id;
        const order = await orderService.getOrderDetailsService(orderId, userId);
        res.render('users/order-details', {
            activePage: 'orders',
            order
        });
    } catch (error) {
        console.error('Load order details error:', error);
        res.redirect('/profile/orders');
    }
};

const loadCoupons = async (req, res) => {
    try {
        const coupons = await orderService.getAvailableCouponsService();
        res.render('users/coupons', {
            activePage: 'coupons',
            coupons
        });
    } catch (error) {
        console.error('Load coupons error:', error);
        res.redirect('/profile');
    }
};

const cancelOrder = async (req, res) => {
    try {
        const userId = req.session.user || req.user?._id;
        const orderId = req.params.id;
        await orderService.cancelOrderService(orderId, userId);
        res.json({ success: true, message: "Order cancelled successfully" });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const returnOrder = async (req, res) => {
    try {
        const userId = req.session.user || req.user?._id;
        const orderId = req.params.id;
        await orderService.returnOrderService(orderId, userId);
        res.json({ success: true, message: "Return initiated successfully" });
    } catch (error) {
        console.error('Return order error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const downloadInvoice = async (req, res) => {
    try {
        const userId = req.session.user || req.user?._id;
        const orderId = req.params.id;
        const order = await orderService.getOrderDetailsService(orderId, userId);
        
        if (!order) {
            return res.status(404).render('users/404');
        }

        res.render('users/invoice', { order });
    } catch (error) {
        console.error('Download invoice error:', error);
        res.redirect('/profile/orders');
    }
};

module.exports = {
    loadCheckout,
    placeOrder,
    loadOrders,
    loadOrderDetails,
    loadCoupons,
    cancelOrder,
    returnOrder,
    downloadInvoice
};
