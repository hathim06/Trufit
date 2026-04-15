const adminAuth = require('../Middlewares/adminAuth');
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../Middlewares/upload');


const productUpload = upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'preview1', maxCount: 1 },
    { name: 'preview2', maxCount: 1 },
    { name: 'preview3', maxCount: 1 }
]);

router.get('/products', adminAuth.isAdmin, productController.loadProductPage);
router.get('/add-product', adminAuth.isAdmin, productController.loadAddProduct);
router.get('/edit-product/:id', adminAuth.isAdmin, productController.loadEditProduct);
router.post('/add-product', adminAuth.isAdmin, productUpload, productController.addProduct);
router.post('/edit-product/:id', adminAuth.isAdmin, productUpload, productController.updateProduct);
router.post('/delete-product/:id', adminAuth.isAdmin, productController.deleteProduct);



module.exports = router;