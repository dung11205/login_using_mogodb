const User = require("../models/user.model");

const requireAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/admin-login");
  }
  const user = await User.findById(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).send("Bạn không có quyền truy cập trang này!");
  }
  req.user = user;
  next();
};

module.exports = { requireAdmin };