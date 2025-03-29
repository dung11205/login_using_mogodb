const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Cấu hình session
app.use(session({
    secret: process.env.SESSION_SECRET || "defaultsecret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, {})
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Định nghĩa Schema và Model
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model("User", UserSchema);

// Middleware kiểm tra đăng nhập
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect("/");
    }
    next();
};

// Trang Login
app.get("/", (req, res) => {
    res.render("login", { error: null });
});

// Trang Signup
app.get("/signup", (req, res) => {
    res.render("signup", { error: null });
});

// Trang Home (chỉ cho người đã đăng nhập)
app.get("/home", requireAuth, async (req, res) => {
    const user = await User.findById(req.session.userId);
    res.render("home", { username: user.username });
});

// Xử lý đăng ký
app.post("/signup", async (req, res) => {
    try {
        const { email, username, password } = req.body;

        // Kiểm tra xem email hoặc username đã tồn tại chưa
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.render("signup", { error: "❌ Email hoặc Username đã được sử dụng!" });
        }

        // Hash mật khẩu
        const hashedPassword = await bcrypt.hash(password, 12);

        // Lưu người dùng mới
        const newUser = new User({ email, username, password: hashedPassword });
        await newUser.save();

        res.redirect("/");
    } catch (error) {
        res.status(500).send("❌ Lỗi khi đăng ký!");
    }
});

// Xử lý đăng nhập
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render("login", { error: "❌ Sai tên đăng nhập hoặc mật khẩu!" });
        }

        // Lưu thông tin đăng nhập vào session
        req.session.userId = user._id;
        res.redirect("/home");
    } catch (error) {
        res.status(500).send("❌ Lỗi khi đăng nhập!");
    }
});

// Xử lý đăng xuất
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

const port = 7777;
app.listen(port, () => {
    console.log(`🚀 Server running on port: ${port}`);
});
