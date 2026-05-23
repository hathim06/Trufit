import { MESSAGES } from './utils/messages.js';
import { STATUS_CODES } from './utils/statusCodes.js';
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
import session from 'express-session';
import connectDB from './Config/db.js';
import passport from './Config/passport.js';

app.use(morgan('dev'))

// Connect to Database
connectDB();

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 72 // 72 hours
    }
}));

import User from './User/models/userModel.js';

// Global variables and cache control
app.use(async (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    if (req.session.user) {
        try {
            const user = await User.findById(req.session.user);
            if (!user || user.isBlocked) {
                const message = !user ? 'Account no longer exists' : MESSAGES.USER_BLOCKED;

                // Store message in session so it survives any intermediate redirects or background failures
                req.session.authMessage = message;

                // Only delete the user session, do not destroy the whole session (preserves admin login)
                delete req.session.user;

                // Do not redirect if it is an admin route
                if (!req.path.startsWith('/admin')) {
                    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
                        return res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, message: message, redirectUrl: '/login' });
                    }
                    return res.redirect(`/login?message=${encodeURIComponent(message)}`);
                }
            } else {
                res.locals.user = req.session.user;
            }
        } catch (error) {
            console.error("Global Auth Check Error:", error);
            res.locals.user = req.session.user;
        }
    } else {
        res.locals.user = null;
    }

    res.locals.admin = req.session.admin || null;

    if (req.path === '/login') return next();

    next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(passport.initialize());

app.use('/public', express.static(path.join(__dirname, 'User', 'public')));

app.set('view engine', 'ejs');
app.set('views', [
    path.join(__dirname, 'User', 'views'),
    path.join(__dirname, 'Admin', 'views')
]);

import userRoute from './User/Routes/userRoute.js';
import productRoute from './User/Routes/productRoute.js';
import cartRoute from './User/Routes/cartRoute.js';
import wishlistRoute from './User/Routes/wishlistRoute.js';
import authRoutes from './User/Routes/auth.js';
import orderRoute from './User/Routes/orderRoute.js';
import adminRoute from './Admin/Routes/adminRoute.js';

import productModel from './User/models/productModel.js';
import bannerModel from './User/models/bannerModel.js';
import categoryModel from './User/models/categoryModel.js';


import adminAuth from './Admin/Middlewares/adminAuth.js';

app.use('/admin', adminRoute);

app.use((req, res, next) => {
    const publicPaths = ['/', '/login', '/signup', '/auth', '/public', '/verify-otp', '/resend-otp', '/forgot-password', '/reset-password'];

    if (publicPaths.includes(req.path) || req.path.startsWith('/admin') || req.path.startsWith('/public') || req.path.startsWith('/auth')) {
        return next();
    }

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
        const activeCategories = await categoryModel.find({ isListed: true }).select('_id');
        const activeCategoryIds = activeCategories.map(cat => cat._id);

        let products = await productModel.find({
            showOnHomepage: true,
            isDeleted: false,
            status: 'Active',
            categoryId: { $in: activeCategoryIds }
        }).sort({ createdAt: -1 }).limit(3);

        if (products.length === 0) {
            products = await productModel.find({
                isDeleted: false,
                status: 'Active',
                categoryId: { $in: activeCategoryIds }
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
