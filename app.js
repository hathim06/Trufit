require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const session = require('express-session');
const connectDB = require('./Config/db');
const passport = require('./Config/passport');
const authRoutes = require('./Routes/auth');

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.locals.user = req.session.user || null;
    res.locals.admin = req.session.admin || null;
    next();
});
connectDB();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(passport.initialize());

const userRoute = require('./Routes/userRoute');
const adminRoute = require('./Routes/adminRoute');
app.use('/users', userRoute);
app.use('/auth', authRoutes);
app.use('/admin', adminRoute);

app.use('/public', express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.render('users/home', {
        user: req.session.user
    });
});

app.use((req, res, next) => {
    if (
        req.path === '/' ||
        req.path.startsWith('/users') ||
        req.path.startsWith('/auth') ||
        req.path.startsWith('/admin') ||
        req.path.startsWith('/public')
    ) {
        return next();
    }

    if (!req.session.user) {
        return res.redirect('/users/login');
    }

    next();
});


const PORT = process.env.PORT;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
});
