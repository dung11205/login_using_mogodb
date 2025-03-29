const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.get("/", authController.getLoginPage);
router.get("/signup", authController.getSignupPage);
router.post("/signup", authController.postSignup);
router.post("/login", authController.postLogin);
router.get("/home", authController.getHomePage);
router.get("/logout", authController.logout);

module.exports = router;
