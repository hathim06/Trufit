const adminAuth = require('../Middlewares/adminAuth');
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const upload = require('../Middlewares/upload');


router.get('/dashboard', adminAuth.isAdmin, adminController.dashboard);
router.get('/users', adminAuth.isAdmin, adminController.getUsers);
router.get('/login', adminAuth.isLoggedOut, adminController.showLogin);
router.post('/login', adminAuth.isLoggedOut, adminController.login);
router.get('/logout', adminController.logout);

router.patch("/users/block/:id", adminAuth.isAdmin, adminController.blockUser);
router.delete("/users/delete/:id", adminAuth.isAdmin, adminController.deleteUser);
router.get("/users/search", adminAuth.isAdmin, adminController.getUsers);
router.patch("/users/unblock/:id", adminAuth.isAdmin, adminController.unblockUser);

router.get('/profile', adminAuth.isAdmin, adminController.showProfile);
router.post("/profile", adminAuth.isAdmin, adminController.updateProfile);

router.get('/users/view/:id', adminAuth.isAdmin, adminController.viewUser);



module.exports = router;