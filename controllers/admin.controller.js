const bcrypt = require("bcrypt");
const User = require("../models/user.model");

// Hiển thị trang admin
exports.getAdminPage = async (req, res) => {
  try {
    const users = await User.find();
    res.render("admin", { users, username: req.user.username });
  } catch (error) {
    res.status(500).send("Lỗi khi tải trang admin!");
  }
};

// Xóa người dùng
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (userId === req.session.userId) {
      return res.status(400).send("Không thể xóa chính mình!");
    }
    await User.findByIdAndDelete(userId);
    res.redirect("/admin");
  } catch (error) {
    res.status(500).send("Lỗi khi xóa người dùng!");
  }
};

// Hiển thị trang đăng nhập admin
exports.getAdminLoginPage = (req, res) => {
  res.render("admin-login", { error: null });
};

// Xử lý đăng nhập admin
exports.postAdminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || user.role !== "admin" || !(await bcrypt.compare(password, user.password))) {
      return res.render("admin-login", { error: "Sai tên đăng nhập hoặc mật khẩu!" });
    }
    req.session.userId = user._id;
    req.session.role = user.role;
    res.redirect("/admin");
  } catch (error) {
    res.status(500).send("Lỗi khi đăng nhập admin!");
  }
};

// Hiển thị trang tạo admin mới
exports.getCreateAdminPage = (req, res) => {
  res.render("admin-create", { error: null });
};

// Xử lý tạo admin mới
exports.postCreateAdmin = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.render("admin-create", { error: "Email hoặc Username đã được sử dụng!" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newAdmin = new User({ email, username, password: hashedPassword, role: "admin" });
    await newAdmin.save();

    res.redirect("/admin");
  } catch (error) {
    res.status(500).render("admin-create", { error: "Lỗi khi tạo admin!" });
  }
};