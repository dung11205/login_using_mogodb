// Cài đặt các package cần thiết: express, mongoose, bcrypt, dotenv, ejs
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(err));

// Định nghĩa Schema và Model
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});
const User = mongoose.model("User", userSchema);

// Routes
app.get("/", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

// Xử lý đăng ký
app.post("/signup", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = new User({
      username: req.body.username,
      password: hashedPassword,
    });
    await newUser.save();
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Lỗi khi đăng ký");
  }
});

// Xử lý đăng nhập
app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (user && (await bcrypt.compare(req.body.password, user.password))) {
      res.send("Đăng nhập thành công!");
    } else {
      res.send("Sai tên đăng nhập hoặc mật khẩu!");
    }
  } catch (error) {
    res.status(500).send("Lỗi khi đăng nhập");
  }
});

const port = 7777;
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
