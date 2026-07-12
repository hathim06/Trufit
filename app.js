import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import session from 'express-session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
import connectDB from './Config/db.js';
import passport from './Config/passport.js';
import createSessionConfig from './Config/sessionConfig.js';
import requestContext from './Middlewares/requestContext.js';
import registerRoutes from './Routes/index.js';
import registerErrorHandlers from './Middlewares/registerErrorHandlers.js';

app.use(morgan('dev'));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// Connect to Database
connectDB();

app.use(session(createSessionConfig(process.env.SESSION_SECRET)));
app.use(requestContext);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(passport.initialize());

app.use('/public', express.static(path.join(__dirname, 'User', 'public')));
app.use('/watch-assets', express.static(path.join(__dirname, 'User', 'public', 'watch-assets')));

app.set('view engine', 'ejs');
app.set('views', [
    path.join(__dirname, 'User', 'views'),
    path.join(__dirname, 'Admin', 'views')
]);

import productModel from './User/models/productModel.js';
import bannerModel from './User/models/bannerModel.js';
import categoryModel from './User/models/categoryModel.js';
import reviewModel from './User/models/reviewModel.js';
import variantModel from './User/models/variants.js';
import { attachEffectiveOffer } from './User/utils/offerPricing.js';

// Home Page
app.get('/', async (req, res) => {
    try {
        const activeCategories = await categoryModel.find({ 
            isListed: { $ne: false }, 
            isDeleted: { $ne: true }, 
            isBlocked: { $ne: true } 
        }).select('_id name');
        const activeCategoryIds = activeCategories.map(cat => cat._id);

        let products = await productModel.find({
            showOnHomepage: true,
            isDeleted: { $ne: true },
            status: 'Active',
            categoryId: { $in: activeCategoryIds }
        }).sort({ createdAt: -1 }).limit(6);

        if (products.length === 0) {
            products = await productModel.find({
                isDeleted: { $ne: true },
                status: 'Active',
                categoryId: { $in: activeCategoryIds }
            }).sort({ createdAt: -1 }).limit(6);
        }

        products = await Promise.all(products.map(async (product) => {
            const variants = await variantModel.find({ productId: product._id, isDeleted: false });
            const productObj = attachEffectiveOffer(product);
            productObj.totalStock = variants.reduce((sum, variant) => sum + (Number(variant.quantity) || 0), 0);
            return productObj;
        }));

        const banners = await bannerModel.find({
            isDeleted: false,
            status: 'Active'
        }).sort({ order: 1 });

        let reviews = await reviewModel.find({
            isVerified: true
        })
            .sort({ createdAt: -1 })
            .limit(6)
            .select('userName userProfilePicture comment rating createdAt');

        if (reviews.length === 0) {
            reviews = await reviewModel.find()
                .sort({ createdAt: -1 })
                .limit(6)
                .select('userName userProfilePicture comment rating createdAt');
        }

        res.render('users/home', {
            user: req.session.user,
            products: products,
            banners: banners,
            categories: activeCategories,
            reviews
        });
    } catch (error) {
        console.log("Home Page Load Error:", error);
        res.render('users/home', {
            user: req.session.user,
            products: [],
            banners: [],
            categories: [],
            reviews: []
        });
    }
});

registerRoutes(app);
registerErrorHandlers(app);

// Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
});

