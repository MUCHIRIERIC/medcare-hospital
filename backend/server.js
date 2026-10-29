const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

if (!process.env.JWT_SECRET) console.warn('⚠️  JWT_SECRET is not set. Logins will fail.');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

/* ------------------------------------------------------------------ */
/* DEFAULT SITE CONTENT (everything here is editable by the admin)     */
/* ------------------------------------------------------------------ */
const DEFAULT_SETTINGS = {
  siteName: 'Medicare Hospital Management System (HMS)',
  logoUrl: '',
  accent: '#0e7490',
  badge: 'Welcome to our medical centre',
  heroTitle: 'Advanced healthcare, delivered with compassion.',
  heroText: 'Book appointments with specialists, receive your medical records and prescriptions online, and let our team manage your care from one secure place.',
  heroImages: [
    { url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80', caption: 'Clean, comfortable patient beds' },
    { url: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1200&q=80', caption: 'Wide, accessible entrances and corridors' },
    { url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80', caption: 'Caring, experienced doctors' }
  ],
  services: [
    { title: 'Patient Portal', text: 'Book appointments with the right specialist, get your appointment code instantly and read your diagnoses and prescriptions.' },
    { title: 'Doctors Portal', text: 'Review your patient queue, update diagnoses and prescriptions, and manage your own clinic schedule.' },
    { title: 'Admin Control Center', text: 'Manage users, wards and beds, doctor schedules, emergency cover, branches and everything on this website.' }
  ],
  categories: ['General Medicine', 'Cardiology', 'Neurology', 'Pediatrics', 'Gynecology & Obstetrics', 'Orthopedics', 'Dentistry', 'Eye Care'],
  hotline: '+254 700 000000',
  email: 'info@medicare.example',
  address: 'Nairobi Medical Tower, Kenya',
  footerNote: 'Providing exceptional patient care, modern diagnostics and streamlined digital hospital management.'
};

/* ------------------------------------------------------------------ */
/* MODELS                                                              */
/* ------------------------------------------------------------------ */
const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['admin', 'doctor', 'patient'], default: 'patient' },
  department: { type: String, default: 'General Medicine' }
}, { timestamps: true }));

const Appointment = mongoose.model('Appointment', new mongoose.Schema({
  code: { type: String, unique: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientName: { type: String, required: true },
  age: { type: Number, required: true, min: 0, max: 120 },
  phone: { type: String, required: true },
  contactName: { type: String, required: true },
  contactPhone: { type: String, required: true },
  needType: { type: String, default: 'Consultation' },
  category: { type: String, default: '' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctorName: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' }
}, { timestamps: true }));

const MedicalRecord = mongoose.model('MedicalRecord', new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientName: { type: String, required: true },
  appointmentCode: { type: String, default: '' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctorName: { type: String, required: true },
  diagnosis: { type: String, required: true },
  prescription: { type: String, required: true },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] }
}, { timestamps: true }));

const Bed = mongoose.model('BedAllocation', new mongoose.Schema({
  wardName: { type: String, required: true },
  bedNumber: { type: String, required: true },
  patientName: { type: String, default: 'Unassigned' },
  status: { type: String, enum: ['Available', 'Occupied'], default: 'Available' }
}));

const Schedule = mongoose.model('Schedule', new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctorName: { type: String, required: true },
  department: { type: String, required: true },
  days: { type: String, required: true },
  timeSlot: { type: String, required: true }
}));

const Emergency = mongoose.model('EmergencyDoctor', new mongoose.Schema({
  caseType: { type: String, required: true },
  doctorName: { type: String, default: '' },
  phone: { type: String, default: '' },
  notes: { type: String, default: '' },
  available: { type: Boolean, default: true }
}));

const Branch = mongoose.model('Branch', new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  image: { type: String, default: '' },
  mapUrl: { type: String, default: '' }
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
  key: { type: String, unique: true },
  data: mongoose.Schema.Types.Mixed
}));

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  if (e.name === 'ValidationError' || e.name === 'CastError') return res.status(400).json({ message: e.message });
  if (e.code === 11000) return res.status(400).json({ message: 'That value already exists' });
  console.error(e);
  res.status(500).json({ message: 'Server error' });
});

const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const httpUrl = (v) => { const s = str(v, 1000); return /^https?:\/\//i.test(s) ? s : ''; };
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genCode = async () => {
  for (;;) {
    let c = 'MC-';
    for (let i = 0; i < 6; i++) c += ALPHA[crypto.randomInt(ALPHA.length)];
    if (!(await Appointment.exists({ code: c }))) return c;
  }
};
const signToken = (u) => jwt.sign({ id: u._id, role: u.role, name: u.name }, process.env.JWT_SECRET, { expiresIn: '30d' });
const userPayload = (u) => ({ token: signToken(u), id: u._id, email: u.email, name: u.name, role: u.role, phone: u.phone, department: u.department });

const getSettings = async () => {
  const doc = await Settings.findOne({ key: 'main' });
  return { ...DEFAULT_SETTINGS, ...((doc && doc.data) || {}) };
};

/* ------------------------------------------------------------------ */
/* AUTH MIDDLEWARE                                                     */
/* ------------------------------------------------------------------ */
const protect = async (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const u = await User.findById(decoded.id).select('name role');
    if (!u) return res.status(401).json({ message: 'Account no longer exists' });
    req.user = { id: String(u._id), name: u.name, role: u.role }; // role always comes from the database
    next();
  } catch (e) {
    res.status(401).json({ message: 'Session expired, please log in again' });
  }
};
const roles = (...allowed) => (req, res, next) =>
  allowed.includes(req.user.role) ? next() : res.status(403).json({ message: 'You do not have permission to do that' });

/* ------------------------------------------------------------------ */
/* SEED                                                                */
/* ------------------------------------------------------------------ */
const seed = async () => {
  try {
    if (!(await User.findOne({ email: 'admin@medicare.com' }))) {
      const pw = process.env.ADMIN_PASSWORD || 'Admin@123';
      await User.create({ name: 'System Admin', email: 'admin@medicare.com', password: await bcrypt.hash(pw, 10), role: 'admin', department: 'Administration' });
      console.log('✅ Default admin created: admin@medicare.com (change the password after first login)');
    }
    if ((await Bed.countDocuments()) === 0) {
      await Bed.insertMany([
        { wardName: 'General Ward A', bedNumber: 'B-101' }, { wardName: 'General Ward A', bedNumber: 'B-102' },
        { wardName: 'ICU', bedNumber: 'ICU-01' }, { wardName: 'Pediatrics', bedNumber: 'P-201' }
      ]);
    }
    if ((await Emergency.countDocuments()) === 0) {
      await Emergency.insertMany([
        { caseType: 'Cardiac emergencies', doctorName: 'To be assigned', phone: '', notes: 'Chest pain, heart attack, severe palpitations' },
        { caseType: 'Accident and trauma', doctorName: 'To be assigned', phone: '', notes: 'Fractures, severe bleeding, road accidents' },
        { caseType: 'Maternity and pediatric emergencies', doctorName: 'To be assigned', phone: '', notes: 'Labour complications, infant and child emergencies' }
      ]);
    }
    if (!(await Settings.findOne({ key: 'main' }))) await Settings.create({ key: 'main', data: DEFAULT_SETTINGS });
  } catch (err) { console.error('Seeding error:', err); }
};
mongoose.connection.once('open', seed);

/* ------------------------------------------------------------------ */
/* PUBLIC                                                              */
/* ------------------------------------------------------------------ */
// "version" lets you confirm Render is running THIS file (it must include adminCreateUser: true)
app.get('/api/health', (req, res) => res.json({ ok: true, version: '2026-10-29', adminCreateUser: true }));

app.get('/api/public', wrap(async (req, res) => {
  const [settings, branches, emergency, schedules] = await Promise.all([
    getSettings(), Branch.find({}).sort({ _id: 1 }), Emergency.find({}).sort({ _id: 1 }), Schedule.find({}).sort({ doctorName: 1 })
  ]);
  res.json({ settings, branches, emergency, schedules });
}));

app.get('/api/schedules', wrap(async (req, res) => res.json(await Schedule.find({}).sort({ doctorName: 1 }))));

/* ------------------------------------------------------------------ */
/* AUTH                                                                */
/* ------------------------------------------------------------------ */
// Public registration creates PATIENT accounts only. Doctors/admins are created by an admin.
app.post('/api/register', wrap(async (req, res) => {
  const name = str(req.body.name, 100), email = str(req.body.email, 150).toLowerCase(), password = req.body.password, phone = str(req.body.phone, 30);
  if (!name || !email || typeof password !== 'string') return res.status(400).json({ message: 'Name, email and password are required' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  if (await User.findOne({ email })) return res.status(400).json({ message: 'An account with this email already exists' });
  const user = await User.create({ name, email, phone, password: await bcrypt.hash(password, 10), role: 'patient' });
  res.status(201).json(userPayload(user));
}));

app.post('/api/login', wrap(async (req, res) => {
  const email = str(req.body.email, 150).toLowerCase();
  const user = await User.findOne({ email });
  if (user && typeof req.body.password === 'string' && (await bcrypt.compare(req.body.password, user.password))) return res.json(userPayload(user));
  res.status(401).json({ message: 'Invalid email or password' });
}));

app.put('/api/me/password', protect, wrap(async (req, res) => {
  const { current, next } = req.body;
  if (typeof next !== 'string' || next.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });
  const user = await User.findById(req.user.id);
  if (!(await bcrypt.compare(current || '', user.password))) return res.status(400).json({ message: 'Current password is incorrect' });
  user.password = await bcrypt.hash(next, 10);
  await user.save();
  res.json({ message: 'Password updated' });
}));

/* ------------------------------------------------------------------ */
/* APPOINTMENTS                                                        */
/* ------------------------------------------------------------------ */
app.get('/api/appointments', protect, wrap(async (req, res) => {
  let filter = {};
  if (req.user.role === 'patient') filter = { patientId: req.user.id };
  if (req.user.role === 'doctor') filter = { $or: [{ doctorId: req.user.id }, { doctorName: req.user.name }] };
  res.json(await Appointment.find(filter).sort({ _id: -1 }));
}));

app.post('/api/appointments', protect, wrap(async (req, res) => {
  const b = req.body;
  const required = ['patientName', 'phone', 'contactName', 'contactPhone', 'date', 'time', 'reason'];
  for (const k of required) if (!str(b[k])) return res.status(400).json({ message: `Missing field: ${k}` });
  const age = Number(b.age);
  if (!Number.isFinite(age) || age < 0 || age > 120) return res.status(400).json({ message: 'Please enter a valid age' });
  const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10); // East Africa Time
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || b.date < today) return res.status(400).json({ message: 'Please choose today or a future date' });

  let doctorName = str(b.doctorName, 100), doctorId;
  if (b.doctorId && mongoose.isValidObjectId(b.doctorId)) {
    const d = await User.findOne({ _id: b.doctorId, role: 'doctor' }).select('name');
    if (d) { doctorId = d._id; doctorName = d.name; }
  }
  if (!doctorName) return res.status(400).json({ message: 'Please choose a doctor' });

  const appt = await Appointment.create({
    code: await genCode(),
    patientId: req.user.id,
    patientName: str(b.patientName, 100), age, phone: str(b.phone, 30),
    contactName: str(b.contactName, 100), contactPhone: str(b.contactPhone, 30),
    needType: str(b.needType, 60) || 'Consultation', category: str(b.category, 80),
    doctorId, doctorName, date: b.date, time: str(b.time, 20), reason: str(b.reason, 1000)
  });
  res.status(201).json(appt);
}));

app.put('/api/appointments/:id', protect, wrap(async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });
  const status = req.body.status;
  if (!['Pending', 'Confirmed', 'Completed', 'Cancelled'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const { role, id, name } = req.user;
  const isOwnerPatient = role === 'patient' && String(appt.patientId) === id;
  const isDoctor = role === 'doctor' && (String(appt.doctorId) === id || appt.doctorName === name);
  if (role !== 'admin' && !isDoctor && !(isOwnerPatient && status === 'Cancelled')) return res.status(403).json({ message: 'Not allowed' });
  appt.status = status;
  await appt.save();
  res.json(appt);
}));

/* ------------------------------------------------------------------ */
/* MEDICAL RECORDS                                                     */
/* ------------------------------------------------------------------ */
app.get('/api/records', protect, wrap(async (req, res) => {
  let filter = {};
  if (req.user.role === 'patient') filter = { $or: [{ patientId: req.user.id }, { patientName: req.user.name }] };
  if (req.user.role === 'doctor') filter = { $or: [{ doctorId: req.user.id }, { doctorName: req.user.name }] };
  res.json(await MedicalRecord.find(filter).sort({ _id: -1 }));
}));

app.post('/api/records', protect, roles('doctor', 'admin'), wrap(async (req, res) => {
  const diagnosis = str(req.body.diagnosis, 2000), prescription = str(req.body.prescription, 3000);
  if (!diagnosis || !prescription) return res.status(400).json({ message: 'Diagnosis and prescription are required' });
  let patientName = str(req.body.patientName, 100), patientId, appointmentCode = '';
  if (req.body.appointmentCode) {
    const a = await Appointment.findOne({ code: str(req.body.appointmentCode, 20) });
    if (a) { patientId = a.patientId; patientName = a.patientName; appointmentCode = a.code; }
  }
  if (!patientName) return res.status(400).json({ message: 'Choose an appointment or enter the patient name' });
  res.status(201).json(await MedicalRecord.create({ patientId, patientName, appointmentCode, doctorId: req.user.id, doctorName: req.user.name, diagnosis, prescription }));
}));

app.put('/api/records/:id', protect, roles('doctor', 'admin'), wrap(async (req, res) => {
  const rec = await MedicalRecord.findById(req.params.id);
  if (!rec) return res.status(404).json({ message: 'Record not found' });
  if (req.user.role !== 'admin' && String(rec.doctorId) !== req.user.id) return res.status(403).json({ message: 'You can only edit your own records' });
  if (req.body.diagnosis) rec.diagnosis = str(req.body.diagnosis, 2000);
  if (req.body.prescription) rec.prescription = str(req.body.prescription, 3000);
  await rec.save();
  res.json(rec);
}));

/* ------------------------------------------------------------------ */
/* BEDS / WARDS (admin)                                                */
/* ------------------------------------------------------------------ */
app.get('/api/beds', protect, roles('admin', 'doctor'), wrap(async (req, res) => res.json(await Bed.find({}).sort({ wardName: 1, bedNumber: 1 }))));
app.post('/api/beds', protect, roles('admin'), wrap(async (req, res) => {
  res.status(201).json(await Bed.create({ wardName: str(req.body.wardName, 80), bedNumber: str(req.body.bedNumber, 40) }));
}));
app.put('/api/beds/:id', protect, roles('admin'), wrap(async (req, res) => {
  const upd = {};
  ['wardName', 'bedNumber', 'patientName'].forEach((k) => { if (k in req.body) upd[k] = str(req.body[k], 100); });
  if (['Available', 'Occupied'].includes(req.body.status)) upd.status = req.body.status;
  res.json(await Bed.findByIdAndUpdate(req.params.id, upd, { new: true, runValidators: true }));
}));
app.delete('/api/beds/:id', protect, roles('admin'), wrap(async (req, res) => { await Bed.findByIdAndDelete(req.params.id); res.json({ message: 'Bed removed' }); }));

/* ------------------------------------------------------------------ */
/* DOCTOR SCHEDULES                                                    */
/* ------------------------------------------------------------------ */
app.post('/api/schedules', protect, roles('admin', 'doctor'), wrap(async (req, res) => {
  const department = str(req.body.department, 80), days = str(req.body.days, 80), timeSlot = str(req.body.timeSlot, 60);
  if (!department || !days || !timeSlot) return res.status(400).json({ message: 'Department, days and time are required' });
  let doctorId = req.user.id, doctorName = req.user.name;
  if (req.user.role === 'admin') {
    const d = mongoose.isValidObjectId(req.body.doctorId) ? await User.findOne({ _id: req.body.doctorId, role: 'doctor' }).select('name') : null;
    if (!d) return res.status(400).json({ message: 'Choose a doctor account' });
    doctorId = d._id; doctorName = d.name;
  }
  res.status(201).json(await Schedule.create({ doctorId, doctorName, department, days, timeSlot }));
}));
app.delete('/api/schedules/:id', protect, roles('admin', 'doctor'), wrap(async (req, res) => {
  const s = await Schedule.findById(req.params.id);
  if (!s) return res.status(404).json({ message: 'Schedule not found' });
  if (req.user.role !== 'admin' && String(s.doctorId) !== req.user.id) return res.status(403).json({ message: 'You can only remove your own schedule' });
  await s.deleteOne();
  res.json({ message: 'Schedule removed' });
}));

/* ------------------------------------------------------------------ */
/* EMERGENCY DOCTORS (admin edits, public reads via /api/public)       */
/* ------------------------------------------------------------------ */
const emergencyBody = (b) => ({ caseType: str(b.caseType, 80) || 'Emergency case', doctorName: str(b.doctorName, 100), phone: str(b.phone, 30), notes: str(b.notes, 300), available: b.available !== false });
app.post('/api/emergency', protect, roles('admin'), wrap(async (req, res) => res.status(201).json(await Emergency.create(emergencyBody(req.body)))));
app.put('/api/emergency/:id', protect, roles('admin'), wrap(async (req, res) => res.json(await Emergency.findByIdAndUpdate(req.params.id, emergencyBody(req.body), { new: true }))));
app.delete('/api/emergency/:id', protect, roles('admin'), wrap(async (req, res) => { await Emergency.findByIdAndDelete(req.params.id); res.json({ message: 'Removed' }); }));

/* ------------------------------------------------------------------ */
/* BRANCHES                                                            */
/* ------------------------------------------------------------------ */
const branchBody = (b) => ({ name: str(b.name, 100), address: str(b.address, 200), phone: str(b.phone, 30), email: str(b.email, 100), image: httpUrl(b.image), mapUrl: httpUrl(b.mapUrl) });
app.post('/api/branches', protect, roles('admin'), wrap(async (req, res) => res.status(201).json(await Branch.create(branchBody(req.body)))));
app.put('/api/branches/:id', protect, roles('admin'), wrap(async (req, res) => res.json(await Branch.findByIdAndUpdate(req.params.id, branchBody(req.body), { new: true, runValidators: true }))));
app.delete('/api/branches/:id', protect, roles('admin'), wrap(async (req, res) => { await Branch.findByIdAndDelete(req.params.id); res.json({ message: 'Branch removed' }); }));

/* ------------------------------------------------------------------ */
/* SITE SETTINGS (admin)                                               */
/* ------------------------------------------------------------------ */
app.put('/api/settings', protect, roles('admin'), wrap(async (req, res) => {
  const b = req.body || {}, clean = {};
  for (const k of ['siteName', 'badge', 'heroTitle', 'heroText', 'hotline', 'email', 'address', 'footerNote']) if (k in b) clean[k] = str(b[k], 600);
  if ('logoUrl' in b) clean.logoUrl = httpUrl(b.logoUrl);
  if ('accent' in b && /^#[0-9a-f]{6}$/i.test(b.accent)) clean.accent = b.accent;
  if (Array.isArray(b.heroImages)) clean.heroImages = b.heroImages.slice(0, 8).map((i) => ({ url: httpUrl(i.url), caption: str(i.caption, 120) })).filter((i) => i.url);
  if (Array.isArray(b.services)) clean.services = b.services.slice(0, 6).map((s) => ({ title: str(s.title, 80), text: str(s.text, 400) }));
  if (Array.isArray(b.categories)) clean.categories = b.categories.map((c) => str(c, 60)).filter(Boolean).slice(0, 40);
  if (clean.siteName === '') clean.siteName = DEFAULT_SETTINGS.siteName;
  const merged = { ...(await getSettings()), ...clean };
  await Settings.findOneAndUpdate({ key: 'main' }, { data: merged }, { upsert: true });
  res.json(merged);
}));

/* ------------------------------------------------------------------ */
/* USER MANAGEMENT (admin)                                             */
/* ------------------------------------------------------------------ */
app.get('/api/users', protect, roles('admin'), wrap(async (req, res) => res.json(await User.find({}).select('-password').sort({ role: 1, name: 1 }))));

app.post('/api/users', protect, roles('admin'), wrap(async (req, res) => {
  const b = req.body, email = str(b.email, 150).toLowerCase();
  if (!str(b.name) || !email || typeof b.password !== 'string' || b.password.length < 8) return res.status(400).json({ message: 'Name, email and a password of 8+ characters are required' });
  if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already in use' });
  const role = ['admin', 'doctor', 'patient'].includes(b.role) ? b.role : 'patient';
  const u = await User.create({ name: str(b.name, 100), email, phone: str(b.phone, 30), role, department: str(b.department, 80) || 'General Medicine', password: await bcrypt.hash(b.password, 10) });
  res.status(201).json({ _id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, department: u.department });
}));

app.put('/api/users/:id', protect, roles('admin'), wrap(async (req, res) => {
  const upd = {};
  if (str(req.body.name)) upd.name = str(req.body.name, 100);
  if ('phone' in req.body) upd.phone = str(req.body.phone, 30);
  if ('department' in req.body) upd.department = str(req.body.department, 80);
  if (['admin', 'doctor', 'patient'].includes(req.body.role)) {
    if (req.params.id === req.user.id && req.body.role !== 'admin') return res.status(400).json({ message: 'You cannot remove your own admin role' });
    upd.role = req.body.role;
  }
  res.json(await User.findByIdAndUpdate(req.params.id, upd, { new: true }).select('-password'));
}));

app.delete('/api/users/:id', protect, roles('admin'), wrap(async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ message: 'You cannot delete your own account' });
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted successfully' });
}));

// Unmatched routes return JSON that names the exact method and path that missed
app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));

app.listen(PORT, () => console.log(`🏥 Medicare HMS Server running on port ${PORT}`));
