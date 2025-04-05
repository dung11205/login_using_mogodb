const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { requireAdmin } = require("../middleware/auth.middleware");

router.get("/", requireAdmin, adminController.getAdminPage);
router.post("/delete/:id", requireAdmin, adminController.deleteUser);
router.get("/login", adminController.getAdminLoginPage); // Route cho trang đăng nhập admin
router.post("/login", adminController.postAdminLogin); // Xử lý đăng nhập admin
router.get("/create", requireAdmin, adminController.getCreateAdminPage); // Route cho trang tạo admin
router.post("/create", requireAdmin, adminController.postCreateAdmin); // Xử lý tạo admin

module.exports = router;