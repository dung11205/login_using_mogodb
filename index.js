const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config();
const app = express();

// Cấu hình view engine và static files
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Cấu hình session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "defaultsecret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Định nghĩa Schema và Model cho User
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
});
const User = mongoose.model("User", UserSchema);

// Định nghĩa Schema và Model cho Admin
const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
});
const Admin = mongoose.model("Admin", AdminSchema);

// Hàm kiểm tra độ mạnh của mật khẩu
const isStrongPassword = (password) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

// Tạo admin mặc định khi server khởi động
const createDefaultAdmin = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const defaultAdminPassword = "Admin@123"; // Mật khẩu mặc định
      const hashedPassword = await bcrypt.hash(defaultAdminPassword, 14);
      const defaultAdmin = new Admin({
        username: "admin",
        email: "admin@gmail.com",
        password: hashedPassword,
      });
      await defaultAdmin.save();
      console.log(
        `Admin mặc định đã được tạo: username=admin, password=${defaultAdminPassword}`
      );
    } else {
      console.log("Admin đã tồn tại, không cần tạo mới.");
    }
  } catch (error) {
    console.error("Lỗi khi tạo admin mặc định:", error);
  }
};

// Gọi hàm tạo admin mặc định sau khi kết nối MongoDB
mongoose.connection.once("open", () => {
  createDefaultAdmin();
});

// Middleware kiểm tra đăng nhập người dùng
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/");
  }
  next();
};

// Middleware kiểm tra quyền admin
const requireAdmin = async (req, res, next) => {
  if (!req.session.adminId) {
    return res.redirect("/admin-login");
  }
  const admin = await Admin.findById(req.session.adminId);
  if (!admin) {
    return res.status(403).send("Bạn không có quyền truy cập trang này!");
  }
  req.admin = admin;
  next();
};

// Trang Login (Người dùng)
app.get("/", (req, res) => {
  res.render("login", { error: null });
});

// Trang Signup (Người dùng)
app.get("/signup", (req, res) => {
  res.render("signup", { error: null });
});

// Trang Home
app.get("/home", requireAuth, async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render("home", { username: user.username, role: user.role });
});

// Trang đăng nhập Admin
app.get("/admin-login", (req, res) => {
  res.render("admin-login", { error: null });
});

// Trang Admin Dashboard
app.get("/admin", requireAdmin, async (req, res) => {
  const users = await User.find();
  res.render("admin", { users, username: req.admin.username });
});

// Trang tạo Admin mới
app.get("/admin/create", requireAdmin, (req, res) => {
  res.render("admin-create", { error: null });
});

// Xử lý đăng ký (Người dùng)
app.post("/signup", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.render("signup", { error: "Email hoặc Username đã được sử dụng!" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ email, username, password: hashedPassword });
    await newUser.save();
    console.log(`Người dùng mới đã đăng ký: ${username}`);
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Lỗi khi đăng ký!");
  }
});

// Xử lý đăng nhập (Người dùng)
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render("login", { error: "Sai tên đăng nhập hoặc mật khẩu!" });
    }
    req.session.userId = user._id;
    req.session.role = user.role;
    console.log(`${user.username} đã đăng nhập vào lúc ${new Date().toLocaleString()}`);
    res.redirect("/home");
  } catch (error) {
    res.status(500).send("Lỗi khi đăng nhập!");
  }
});

// Xử lý đăng nhập Admin
app.post("/admin-login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });

    if (admin && admin.lockUntil && admin.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((admin.lockUntil - Date.now()) / 1000 / 60);
      return res.render("admin-login", {
        error: `Tài khoản bị khóa! Vui lòng thử lại sau ${remainingTime} phút.`,
      });
    }

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      if (admin) {
        admin.failedLoginAttempts += 1;
        if (admin.failedLoginAttempts >= 5) {
          admin.lockUntil = Date.now() + 15 * 60 * 1000;
          admin.failedLoginAttempts = 0;
        }
        await admin.save();
      }
      return res.render("admin-login", { error: "Sai tên đăng nhập hoặc mật khẩu!" });
    }

    admin.failedLoginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();

    req.session.adminId = admin._id;
    console.log(`${admin.username} (Admin) đã đăng nhập vào lúc ${new Date().toLocaleString()}`);
    res.redirect("/admin");
  } catch (error) {
    res.status(500).send("Lỗi khi đăng nhập admin!");
  }
});

// 
app.post("/admin/create", requireAdmin, async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const existingAdmin = await Admin.findOne({ $or: [{ email }, { username }] });
    if (existingAdmin) {
      return res.render("admin-create", { error: "Email hoặc Username đã được sử dụng!" });
    }

    if (!isStrongPassword(password)) {
      return res.render("admin-create", {
        error:
          "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt!",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 14);
    const newAdmin = new Admin({ email, username, password: hashedPassword });
    await newAdmin.save();
    console.log(`Admin mới đã được tạo: ${username}`);
    res.redirect("/admin");
  } catch (error) {
    res.status(500).render("admin-create", { error: "Lỗi khi tạo admin!" });
  }
});

// Xử lý xóa người dùng
app.post("/admin/delete/:id", requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndDelete(userId);
    res.redirect("/admin");
  } catch (error) {
    res.status(500).send("Lỗi khi xóa người dùng!");
  }
});

// Đăng xuất
app.get("/logout", async (req, res) => {
  let username = "Unknown";
  if (req.session.userId) {
    const user = await User.findById(req.session.userId);
    username = user?.username || "Unknown";
  } else if (req.session.adminId) {
    const admin = await Admin.findById(req.session.adminId);
    username = admin?.username || "Unknown";
  }
  console.log(`${username} đã đăng xuất lúc ${new Date().toLocaleString()}`);
  req.session.destroy(() => {
    res.redirect("/");
  });
});

const port = 7777;
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
