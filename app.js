require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const session = require('express-session');
const connectDB = require('./Config/db');
const passport = require('./Config/passport');

// Connect to Database
connectDB();

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Global variables and cache control
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.locals.user = req.session.user || null;
    res.locals.admin = req.session.admin || null;
    next();
});

// Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Initialize Passport
app.use(passport.initialize());

// Static Files
app.use('/public', express.static(path.join(__dirname, 'User', 'public')));

// View Engine
app.set('view engine', 'ejs');
app.set('views', [
    path.join(__dirname, 'User', 'views'),
    path.join(__dirname, 'Admin', 'views')
]);

// Routes
const userRoute = require('./User/Routes/userRoute');
const productRoute = require('./User/Routes/productRoute');
const cartRoute = require('./User/Routes/cartRoute');
const wishlistRoute = require('./User/Routes/wishlistRoute');
const orderRoute = require('./User/Routes/orderRoute');
const authRoutes = require('./User/Routes/auth');
const adminRoute = require('./Admin/Routes/adminRoute');

const productModel = require('./User/models/productModel');
const bannerModel = require('./User/models/bannerModel');

// Admin Auth Middleware (for blocking access to /admin routes)
const adminAuth = require('./Admin/Middlewares/adminAuth');
// app.use('/admin', adminAuth.adminAuthc); // This might be problematic if not carefully implemented

// Mount Routes
app.use('/admin', adminRoute);

// Public access allowed for home page and specific auth/static paths
app.use((req, res, next) => {
    const publicPaths = ['/', '/login', '/signup', '/auth', '/public', '/verify-otp', '/resend-otp', '/forgot-password', '/reset-password'];
    
    // Allow home page, public paths, auth routes, and admin routes
    if (publicPaths.includes(req.path) || req.path.startsWith('/admin') || req.path.startsWith('/public') || req.path.startsWith('/auth')) {
        return next();
    }

    // Redirect to login if not authenticated
    if (!req.session.user) {
        return res.redirect('/login');
    }

    next();
});

app.use('/', userRoute);
app.use('/', productRoute);
app.use('/', cartRoute);
app.use('/', wishlistRoute);
app.use('/', orderRoute);
app.use('/auth', authRoutes);

// Home Page
app.get('/', async (req, res) => {
    try {
        // Try to find products specifically marked for the homepage
        let products = await productModel.find({
            showOnHomepage: true,
            isDeleted: false,
            status: 'Active'
        }).sort({ createdAt: -1 }).limit(3);

        // Fallback: If no products are marked for homepage, just show the 3 latest active products
        if (products.length === 0) {
            products = await productModel.find({
                isDeleted: false,
                status: 'Active'
            }).sort({ createdAt: -1 }).limit(3);
        }

        const banners = await bannerModel.find({
            isDeleted: false,
            status: 'Active'
        }).sort({ order: 1 });

        res.render('users/home', {
            user: req.session.user,
            products: products,
            banners: banners
        });
    } catch (error) {
        console.log("Home Page Load Error:", error);
        res.render('users/home', {
            user: req.session.user,
            products: [],
            banners: []
        });
    }
});

// Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
});
