import express from 'express';
const router = express.Router();
import adminAuth from '../Middlewares/adminAuth.js';
import upload from '../../User/Middlewares/upload.js';
import { validateBody  } from '../../User/Middlewares/validationMiddleware.js';
import { categorySchema  } from '../../User/utils/schemas.js';

// Controllers
import adminController from '../controllers/adminController.js';
import userController from '../controllers/userController.js';
import categoryController from '../controllers/categoryController.js';
import productController from '../controllers/productController.js';
import orderController from '../controllers/orderController.js';
import inventoryController from '../controllers/inventoryController.js';
import bannerController from '../controllers/bannerController.js';
import colorController from '../controllers/colorController.js';

// Auth & Dashboard
router.get('/login', adminAuth.isLoggedOut, adminController.showLogin);
router.post('/login', adminAuth.isLoggedOut, adminController.login);
router.get('/logout', adminController.logout);
router.get('/dashboard', adminAuth.isAdmin, adminController.dashboard);
router.get('/profile', adminAuth.isAdmin, adminController.showProfile);
router.post('/profile', adminAuth.isAdmin, adminController.updateProfile);

// User Management
router.get('/users', adminAuth.isAdmin, userController.getUsers);
router.get('/users/view/:id', adminAuth.isAdmin, userController.viewUser);
router.patch('/users/block/:id', adminAuth.isAdmin, userController.blockUser);
router.patch('/users/unblock/:id', adminAuth.isAdmin, userController.unblockUser);
router.patch('/users/soft-delete/:id', adminAuth.isAdmin, userController.softDeleteUser);
router.patch('/users/restore/:id', adminAuth.isAdmin, userController.restoreUser);
router.delete('/users/hard-delete/:id', adminAuth.isAdmin, userController.hardDeleteUser);

// Category Management
router.get('/categories', adminAuth.isAdmin, categoryController.getCategories);
router.get('/add-category', adminAuth.isAdmin, categoryController.loadAddCategory);
router.post('/add-category', adminAuth.isAdmin, validateBody(categorySchema), categoryController.addCategory);
router.get('/edit-category/:id', adminAuth.isAdmin, categoryController.loadEditCategory);
router.post('/edit-category/:id', adminAuth.isAdmin, validateBody(categorySchema), categoryController.updateCategory);
router.patch('/categories/toggle/:id', adminAuth.isAdmin, categoryController.toggleCategoryListing);
router.patch('/categories/soft-delete/:id', adminAuth.isAdmin, categoryController.softDeleteCategory);
router.patch('/categories/restore/:id', adminAuth.isAdmin, categoryController.restoreCategory);
router.delete('/categories/hard-delete/:id', adminAuth.isAdmin, categoryController.hardDeleteCategory);
router.patch('/categories/block/:id', adminAuth.isAdmin, categoryController.blockCategory);
router.patch('/categories/unblock/:id', adminAuth.isAdmin, categoryController.unblockCategory);

// Product Management
router.get('/products', adminAuth.isAdmin, productController.loadProductPage);
router.get('/add-product', adminAuth.isAdmin, productController.loadAddProduct);
router.post('/add-product', adminAuth.isAdmin, upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'preview1', maxCount: 1 },
    { name: 'preview2', maxCount: 1 },
    { name: 'preview3', maxCount: 1 },
    { name: 'v1_image1', maxCount: 1 }, { name: 'v1_image2', maxCount: 1 }, { name: 'v1_image3', maxCount: 1 }, { name: 'v1_image4', maxCount: 1 }, { name: 'v1_image5', maxCount: 1 },
    { name: 'v2_image1', maxCount: 1 }, { name: 'v2_image2', maxCount: 1 }, { name: 'v2_image3', maxCount: 1 }, { name: 'v2_image4', maxCount: 1 }, { name: 'v2_image5', maxCount: 1 },
    { name: 'v3_image1', maxCount: 1 }, { name: 'v3_image2', maxCount: 1 }, { name: 'v3_image3', maxCount: 1 }, { name: 'v3_image4', maxCount: 1 }, { name: 'v3_image5', maxCount: 1 },
    { name: 'v4_image1', maxCount: 1 }, { name: 'v4_image2', maxCount: 1 }, { name: 'v4_image3', maxCount: 1 }, { name: 'v4_image4', maxCount: 1 }, { name: 'v4_image5', maxCount: 1 },
    { name: 'v5_image1', maxCount: 1 }, { name: 'v5_image2', maxCount: 1 }, { name: 'v5_image3', maxCount: 1 }, { name: 'v5_image4', maxCount: 1 }, { name: 'v5_image5', maxCount: 1 }
]), productController.addProduct);
router.get('/edit-product/:id', adminAuth.isAdmin, productController.loadEditProduct);
router.post('/edit-product/:id', adminAuth.isAdmin, upload.fields([
    { name: 'v1_image1', maxCount: 1 }, { name: 'v1_image2', maxCount: 1 }, { name: 'v1_image3', maxCount: 1 }, { name: 'v1_image4', maxCount: 1 }, { name: 'v1_image5', maxCount: 1 },
    { name: 'v2_image1', maxCount: 1 }, { name: 'v2_image2', maxCount: 1 }, { name: 'v2_image3', maxCount: 1 }, { name: 'v2_image4', maxCount: 1 }, { name: 'v2_image5', maxCount: 1 },
    { name: 'v3_image1', maxCount: 1 }, { name: 'v3_image2', maxCount: 1 }, { name: 'v3_image3', maxCount: 1 }, { name: 'v3_image4', maxCount: 1 }, { name: 'v3_image5', maxCount: 1 },
    { name: 'v4_image1', maxCount: 1 }, { name: 'v4_image2', maxCount: 1 }, { name: 'v4_image3', maxCount: 1 }, { name: 'v4_image4', maxCount: 1 }, { name: 'v4_image5', maxCount: 1 },
    { name: 'v5_image1', maxCount: 1 }, { name: 'v5_image2', maxCount: 1 }, { name: 'v5_image3', maxCount: 1 }, { name: 'v5_image4', maxCount: 1 }, { name: 'v5_image5', maxCount: 1 }
]), productController.updateProduct);
router.delete('/delete-product/:id', adminAuth.isAdmin, productController.deleteProduct);
router.patch('/products/soft-delete/:id', adminAuth.isAdmin, productController.softDeleteProduct);
router.patch('/products/restore/:id', adminAuth.isAdmin, productController.restoreProduct);
router.delete('/products/hard-delete/:id', adminAuth.isAdmin, productController.hardDeleteProduct);
router.patch('/block-product/:id', adminAuth.isAdmin, productController.blockProduct);
router.patch('/unblock-product/:id', adminAuth.isAdmin, productController.unblockProduct);

// Variant Management (Individual)
router.post('/variants/add/:productId', adminAuth.isAdmin, upload.array('image', 3), productController.addVariant);
router.put('/variants/update/:variantId', adminAuth.isAdmin, upload.array('image', 3), productController.updateVariant);
router.delete('/variants/delete/:variantId', adminAuth.isAdmin, productController.deleteVariant);

// Banner Management
router.get('/banners', adminAuth.isAdmin, bannerController.loadBannerPage);
router.get('/add-banner', adminAuth.isAdmin, bannerController.loadAddBanner);
router.post('/add-banner', adminAuth.isAdmin, upload.single('image'), bannerController.addBanner);
router.get('/edit-banner/:id', adminAuth.isAdmin, bannerController.loadEditBanner);
router.post('/update-banner/:id', adminAuth.isAdmin, upload.single('image'), bannerController.updateBanner);
router.patch('/banner-status/:id', adminAuth.isAdmin, bannerController.toggleBannerStatus);
router.delete('/delete-banner/:id', adminAuth.isAdmin, bannerController.deleteBanner);

// Color Management
router.get('/colors', adminAuth.isAdmin, colorController.getColorsPage);
router.post('/colors/add', adminAuth.isAdmin, colorController.addColor);
router.patch('/colors/soft-delete/:id', adminAuth.isAdmin, colorController.softDeleteColor);
router.patch('/colors/restore/:id', adminAuth.isAdmin, colorController.restoreColor);
router.delete('/colors/hard-delete/:id', adminAuth.isAdmin, colorController.hardDeleteColor);
router.patch('/colors/block/:id', adminAuth.isAdmin, colorController.blockColor);
router.patch('/colors/unblock/:id', adminAuth.isAdmin, colorController.unblockColor);

// Order Management
router.get('/orders', adminAuth.isAdmin, orderController.getOrders);
router.get('/orders/:id', adminAuth.isAdmin, orderController.getOrderDetails);
router.patch('/orders/status/:id', adminAuth.isAdmin, orderController.updateOrderStatus);

// Inventory Management
router.get('/inventory', adminAuth.isAdmin, inventoryController.getInventory);
router.patch('/inventory/update', adminAuth.isAdmin, inventoryController.updateStock);

export default router;