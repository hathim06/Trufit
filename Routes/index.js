import userRoute from '../User/Routes/userRoute.js';
import productRoute from '../User/Routes/productRoute.js';
import cartRoute from '../User/Routes/cartRoute.js';
import wishlistRoute from '../User/Routes/wishlistRoute.js';
import authRoutes from '../User/Routes/auth.js';
import orderRoute from '../User/Routes/orderRoute.js';
import adminRoute from '../Admin/Routes/adminRoute.js';
import requireUserSession from '../Middlewares/requireUserSession.js';

const registerRoutes = (app) => {
    app.use('/admin', adminRoute);

    app.use(requireUserSession);
    app.use('/', userRoute);
    app.use('/', productRoute);
    app.use('/', cartRoute);
    app.use('/', wishlistRoute);
    app.use('/', orderRoute);
    app.use('/auth', authRoutes);
};

export default registerRoutes;
