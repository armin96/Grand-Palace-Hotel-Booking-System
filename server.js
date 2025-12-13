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

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'public')));

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Database Connection
mongoose.connect('mongodb+srv://rezamar2002_db_user:Reza123%21%40%23@cluster0.g1mxgem.mongodb.net/grandpalace?retryWrites=true&w=majority')
  .then(() => console.log(' Connected to MongoDB'))
  .catch(err => console.log(' DB Error:', err));

// --- Schemas ---
const UserSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'user' }
});
const User = mongoose.model('User', UserSchema);

const RoomSchema = new mongoose.Schema({
  type: String,
  beds: Number,
  fullPrice: Number,
  discount: Number,
  image: String
});
const Room = mongoose.model('Room', RoomSchema);

const ServiceSchema = new mongoose.Schema({
  name: String,
  price: Number
});
const Service = mongoose.model('Service', ServiceSchema);

const BookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
});
const Booking = mongoose.model('Booking', BookingSchema);

// --- Seeding Data ---
const ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80'
];

async function seedData() {
  // Admin
  if (!await User.findOne({ username: 'rezamar2002' })) {
    const hashed = await bcrypt.hash('admin123', 10);
    await User.create({ username: 'rezamar2002', email: 'admin@hotel.com', password: hashed, role: 'admin' });
    console.log(' Admin created');
  }
  
  // Test User
  if (!await User.findOne({ email: 'ali@test.com' })) {
    const hashed = await bcrypt.hash('123456', 10);
    await User.create({ username: 'ali_reza', email: 'ali@test.com', password: hashed, role: 'user' });
    console.log(' Test User created');
  }

  // Services
  if (await Service.countDocuments() === 0) {
    await Service.insertMany([{ name: 'Breakfast', price: 25 }, { name: 'Spa', price: 50 }, { name: 'Transfer', price: 30 }]);
  }

  // Rooms
  const rooms = await Room.find();
  if (rooms.length === 0) {
    await Room.insertMany([
      { type: 'Deluxe King', beds: 1, fullPrice: 280, discount: 10, image: ROOM_IMAGES[0] },
      { type: 'Royal Suite', beds: 2, fullPrice: 450, discount: 20, image: ROOM_IMAGES[1] },
      { type: 'Presidential', beds: 3, fullPrice: 1200, discount: 0, image: ROOM_IMAGES[2] },
      { type: 'Ocean View', beds: 2, fullPrice: 350, discount: 15, image: ROOM_IMAGES[3] }
    ]);
    console.log('✅ Rooms created');
  }

  // Mock Bookings for Chart
  if (await Booking.countDocuments() === 0 && rooms.length > 0) {
     const u = await User.findOne({role:'user'});
     const r = await Room.findOne();
     await Booking.create({
         userId: u._id, roomId: r._id, guestName: 'Demo', guestEmail: u.email,
         checkIn: new Date(), checkOut: new Date(), nights: 2, guests: 2, totalPrice: 500, services: ['Spa']
     });
     console.log(' Mock booking created');
  }
}
seedData();

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ msg: 'Email exists' });
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, password: hashed });
  const token = jwt.sign({ id: user._id, role: user.role }, 'secret-key');
  res.json({ token, user: { username, email, role: user.role } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ $or: [{ email }, { username: email }] });
  if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).json({ msg: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, role: user.role }, 'secret-key');
  res.json({ token, user: { username: user.username, email: user.email, role: user.role } });
});

// Admin Login (Legacy support)
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || user.role !== 'admin' || !await bcrypt.compare(password, user.password)) return res.status(400).json({ msg: 'Invalid' });
    res.json({ token: jwt.sign({ id: user._id, role: user.role }, 'secret-key') });
});

// --- API Routes ---
app.get('/api/rooms', async (req, res) => res.json(await Room.find()));
app.post('/api/rooms', async (req, res) => res.json(await Room.create(req.body)));
app.put('/api/rooms/:id', async (req, res) => res.json(await Room.findByIdAndUpdate(req.params.id, req.body, {new:true})));
app.delete('/api/rooms/:id', async (req, res) => { await Room.findByIdAndDelete(req.params.id); res.json({msg:'ok'}); });

app.get('/api/services', async (req, res) => res.json(await Service.find()));
app.post('/api/services', async (req, res) => res.json(await Service.create(req.body)));
app.delete('/api/services/:id', async (req, res) => { await Service.findByIdAndDelete(req.params.id); res.json({msg:'ok'}); });

app.get('/api/bookings', async (req, res) => res.json(await Booking.find().populate('roomId')));
app.delete('/api/bookings/:id', async (req, res) => { await Booking.findByIdAndDelete(req.params.id); res.json({msg:'ok'}); });

// Create Booking
app.post('/api/bookings', async (req, res) => {
  const { guestEmail, token } = req.body;
  let userId = null;
  
  if (token) {
    try { userId = jwt.verify(token, 'secret-key').id; } catch(e) {}
  }
  
  if (!userId) {
    let user = await User.findOne({ email: guestEmail });
    if (!user) {
      const hashed = await bcrypt.hash('123456', 10);
      user = await User.create({ username: guestEmail.split('@')[0], email: guestEmail, password: hashed });
    }
    userId = user._id;
  }
  const booking = await Booking.create({ ...req.body, userId });
  res.json(booking);
});

// User Dashboard
app.get('/api/my-bookings', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, 'secret-key');
    const bookings = await Booking.find({ userId: decoded.id }).populate('roomId');
    res.json(bookings);
  } catch (e) { res.status(401).json({ msg: 'Invalid token' }); }
});

app.get('/api/users', async (req, res) => res.json(await User.find()));
app.delete('/api/users/:id', async (req, res) => { await User.findByIdAndDelete(req.params.id); res.json({msg:'ok'}); });
app.put('/api/users/:id/role', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { role: req.body.role });
    res.json({msg:'updated'});
});

app.post('/api/upload', upload.single('image'), (req, res) => res.json({ url: `/uploads/${req.file.filename}` }));

app.listen(3000, () => console.log(' Server running on http://localhost:3000'));