import express from 'express';
const router = express.Router();
import adminAuth from '../Middlewares/adminAuth.js';
import upload from '../../User/Middlewares/upload.js';
import { validateBody } from '../../User/Middlewares/validationMiddleware.js';
import { couponSchema } from '../../User/utils/schemas.js';
import * as couponController from '../controllers/couponController.js';


router.get('/coupons', adminAuth.isAdmin, couponController.getCoupons);
router.get('/add-coupon', adminAuth.isAdmin, couponController, couponController.loadAddCoupon);
router.post('/add-coupon', adminAuth.isAdmin, couponController, couponController.addCoupon);
router.get('/edit-coupon/:id', adminAuth.isAdmin, couponController.loadEditCoupon);
router.post('/edit-coupon', adminAuth.isAdmin, couponController.updateCoupon);
router.delete('/coupons/delete/:id', adminAuth.isAdmin, couponController.deleteCoupon);
router.put('/coupons/toggle/:id', adminAuth.isAdmin, couponController.toggleStatus);

export default router;

