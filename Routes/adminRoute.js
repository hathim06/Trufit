const adminAuth = require('../Middlewares/adminAuth');
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');


router.get('/dashboard', adminAuth.isAdmin, adminController.dashboard);
router.get('/users', adminAuth.isAdmin, adminController.getUsers);
router.get('/login', adminController.showLogin);
router.post('/login', adminController.login);
router.get('/logout', adminController.logout);

router.get("/users/add", adminAuth.isAdmin, adminController.loadAddUser);
router.post("/users/add", adminAuth.isAdmin, adminController.addUser);
router.get("/users/edit/:id", adminAuth.isAdmin, adminController.loadEditUser);
router.post("/users/edit/:id", adminAuth.isAdmin, adminController.updateUser);

router.patch("/users/block/:id", adminAuth.isAdmin, adminController.blockUser);
router.delete("/users/delete/:id", adminAuth.isAdmin, adminController.deleteUser);
router.get("/users/search", adminAuth.isAdmin, adminController.getUsers);
router.patch("/users/unblock/:id", adminAuth.isAdmin, adminController.unblockUser);

module.exports = router;