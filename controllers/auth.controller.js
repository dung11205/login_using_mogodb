exports.postSignup = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Kiểm tra xem email hoặc username đã tồn tại chưa
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.send("❌ Email hoặc Username đã được sử dụng!");
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
};
