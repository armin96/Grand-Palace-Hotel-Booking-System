const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// پوشه آپلود
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
app.use('/uploads', express.static('uploads')); 
app.use(express.static(path.join(__dirname, 'public')));

// تنظیمات آپلود عکس
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// اتصال به دیتابیس
mongoose.connect('mongodb+srv://rezamar2002_db_user:Reza123%21%40%23@cluster0.g1mxgem.mongodb.net/grandpalace?retryWrites=true&w=majority')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.log('❌ DB Error:', err));

// --- Models ---
const User = mongoose.model('User', new mongoose.Schema({
  username: String, 
  email: { type: String, unique: true }, // ایمیل باید یکتا باشد
  password: String, 
  role: { type: String, default: 'user' }
}));

const Room = mongoose.model('Room', new mongoose.Schema({
  type: String, beds: Number, fullPrice: Number, discount: Number, image: String
}));

const Service = mongoose.model('Service', new mongoose.Schema({
  name: String, price: Number
}));

const Booking = mongoose.model('Booking', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // ارتباط با کاربر
  guestName: String, 
  guestEmail: String, 
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  services: [String], 
  checkIn: Date, 
  checkOut: Date, 
  nights: Number, 
  guests: Number,
  totalPrice: Number,
  status: { type: String, default: 'confirmed' }
}));

// --- Seed Data ---
async function seedData() {
  if (!await User.findOne({ username: 'rezamar2002' })) {
    const hashed = await bcrypt.hash('admin123', 10);
    await User.create({ username: 'rezamar2002', email:'admin@grand.com', password: hashed, role: 'admin' });
    console.log('✅ Admin Created');
  }
  if (await Service.countDocuments() === 0) {
    await Service.insertMany([{ name: 'Breakfast', price: 25 }, { name: 'Spa', price: 50 }, { name: 'Transfer', price: 30 }]);
  }
  if (await Room.countDocuments() === 0) {
    await Room.insertMany([
      { type: 'Deluxe Room', beds: 1, fullPrice: 200, discount: 0, image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800' },
      { type: 'Family Suite', beds: 2, fullPrice: 350, discount: 15, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800' }
    ]);
  }
}
seedData();

// --- Auth Routes (ثبت نام و لاگین) ---
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ msg: 'Email already exists' });
  
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, password: hashed });
  const token = jwt.sign({ id: user._id, role: user.role }, 'secret-key');
  res.json({ token, user: { username, email, role: user.role } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body; // لاگین با ایمیل برای کاربر
  const user = await User.findOne({ email }); // جستجو با ایمیل
  
  // برای ادمین که یوزرنیم دارد هندل میکنیم:
  const adminUser = await User.findOne({ username: email }); // شاید یوزرنیم فرستاده باشه
  const targetUser = user || adminUser;

  if (!targetUser || !await bcrypt.compare(password, targetUser.password)) {
    return res.status(400).json({ msg: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: targetUser._id, role: targetUser.role }, 'secret-key');
  res.json({ token, user: { username: targetUser.username, email: targetUser.email, role: targetUser.role } });
});

// --- User Dashboard Route (داشبورد کاربر) ---
app.get('/api/my-bookings', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, 'secret-key');
    // پیدا کردن رزروهایی که userId آنها با کاربر لاگین شده یکی است
    const bookings = await Booking.find({ userId: decoded.id }).populate('roomId');
    res.json(bookings);
  } catch (e) {
    res.status(401).json({ msg: 'Invalid token' });
  }
});

// --- General Routes ---
app.get('/api/rooms', async (req, res) => res.json(await Room.find()));
app.get('/api/services', async (req, res) => res.json(await Service.find()));

// ادمین: دیدن همه رزروها
app.get('/api/bookings', async (req, res) => res.json(await Booking.find().populate('roomId')));
app.delete('/api/bookings/:id', async (req, res) => { await Booking.findByIdAndDelete(req.params.id); res.json({msg:'ok'}); });

// ثبت رزرو (هوشمند: اگر توکن باشد userId را ذخیره می‌کند)
app.post('/api/bookings', async (req, res) => {
  const { guestEmail, token } = req.body;
  let userId = null;

  // اگر توکن فرستاده شده، آیدی کاربر را درمیاریم
  if (token) {
     try {
       const decoded = jwt.verify(token, 'secret-key');
       userId = decoded.id;
     } catch(e) {}
  }
  
  // اگر یوزر لاگین نکرده بود، چک میکنیم یوزر مهمان بسازیم
  if (!userId) {
     let user = await User.findOne({ email: guestEmail });
     if (!user) {
       const hashed = await bcrypt.hash('default123', 10);
       user = await User.create({ username: guestEmail.split('@')[0], email: guestEmail, password: hashed, role: 'user' });
     }
     userId = user._id;
  }

  const booking = await Booking.create({ ...req.body, userId });
  res.json(booking);
});

// پنل ادمین
app.post('/api/admin/login', async (req, res) => { /* ... کد قبلی ... */ }); // این روت دیگر با لاگین بالا ادغام شد اما برای سازگاری میتواند بماند
app.get('/api/users', async (req, res) => res.json(await User.find()));
app.delete('/api/users/:id', async (req, res) => { await User.findByIdAndDelete(req.params.id); res.json({msg:'ok'}); });
app.put('/api/users/:id/role', async (req, res) => { const u = await User.findById(req.params.id); u.role = req.body.role; await u.save(); res.json(u); });
app.post('/api/rooms', async (req, res) => res.json(await Room.create(req.body)));
app.put('/api/rooms/:id', async (req, res) => res.json(await Room.findByIdAndUpdate(req.params.id, req.body, {new:true})));
app.delete('/api/rooms/:id', async (req, res) => { await Room.findByIdAndDelete(req.params.id); res.json({msg:'ok'}); });
app.post('/api/services', async (req, res) => res.json(await Service.create(req.body)));
app.delete('/api/services/:id', async (req, res) => { await Service.findByIdAndDelete(req.params.id); res.json({msg:'ok'}); });
app.post('/api/upload', upload.single('image'), (req, res) => res.json({ url: `/uploads/${req.file.filename}` }));

app.listen(3000, () => console.log('🚀 Server running on port 3000'));