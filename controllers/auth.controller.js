const bcrypt = require("bcrypt");
const User = require("../models/user.model");

// Hiển thị trang đăng nhập
exports.getLoginPage = (req, res) => {
  res.render("login");
};

// Hiển thị trang đăng ký
exports.getSignupPage = (req, res) => {
  res.render("signup");
};

// Xử lý đăng ký
exports.postSignup = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.send(" Email hoặc Username đã được sử dụng!");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ email, username, password: hashedPassword });
    await newUser.save();

    res.redirect("/");
  } catch (error) {
    res.status(500).send(" Lỗi khi đăng ký!");
  }
};

// Xử lý đăng nhập
exports.postLogin = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
      req.session.user = { username: user.username, email: user.email };
      return res.redirect("/home");
    }
    res.send(" Sai tên đăng nhập hoặc mật khẩu!");
  } catch (error) {
    res.status(500).send(" Lỗi khi đăng nhập!");
  }
};

// Hiển thị trang home (chỉ khi đã đăng nhập)
exports.getHomePage = (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  res.render("home", { username: req.session.user.username });
};

// Xử lý đăng xuất
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};
