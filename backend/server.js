const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// --- SCHEMAS & MODELS ---
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'doctor', 'patient'], default: 'patient' },
    department: { type: String, default: 'General Medicine' }
});
const User = mongoose.model('User', UserSchema);

const AppointmentSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    patientName: { type: String, required: true },
    doctorName: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, default: 'Pending' }, // Pending, Confirmed, Completed
    reason: { type: String, required: true }
});
const Appointment = mongoose.model('Appointment', AppointmentSchema);

const MedicalRecordSchema = new mongoose.Schema({
    patientName: { type: String, required: true },
    doctorName: { type: String, required: true },
    diagnosis: { type: String, required: true },
    prescription: { type: String, required: true },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] }
});
const MedicalRecord = mongoose.model('MedicalRecord', MedicalRecordSchema);

const BedAllocationSchema = new mongoose.Schema({
    wardName: { type: String, required: true },
    bedNumber: { type: String, required: true },
    patientName: { type: String, default: 'Unassigned' },
    status: { type: String, enum: ['Available', 'Occupied'], default: 'Available' }
});
const BedAllocation = mongoose.model('BedAllocation', BedAllocationSchema);

const ScheduleSchema = new mongoose.Schema({
    doctorName: { type: String, required: true },
    department: { type: String, required: true },
    days: { type: String, required: true },
    timeSlot: { type: String, required: true }
});
const Schedule = mongoose.model('Schedule', ScheduleSchema);

// --- SEED INITIAL ADMIN & DEMO DATA ---
const seedDatabase = async () => {
    try {
        const adminExists = await User.findOne({ email: 'admin@medicare.com' });
        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Admin@123', salt);
            await User.create({
                name: 'Dr. System Admin',
                email: 'admin@medicare.com',
                password: hashedPassword,
                role: 'admin',
                department: 'Administration'
            });
            console.log('✅ Default Admin seeded: admin@medicare.com / Admin@123');
        }

        const bedCount = await BedAllocation.countDocuments();
        if (bedCount === 0) {
            await BedAllocation.insertMany([
                { wardName: 'General Ward A', bedNumber: 'B-101', status: 'Available' },
                { wardName: 'General Ward A', bedNumber: 'B-102', status: 'Available' },
                { wardName: 'ICU', bedNumber: 'ICU-01', status: 'Available' },
                { wardName: 'Pediatrics', bedNumber: 'P-201', status: 'Available' }
            ]);
            console.log('✅ Default Hospital Beds seeded');
        }
    } catch (err) {
        console.error('Seeding error:', err);
    }
};
seedDatabase();

// --- AUTH MIDDLEWARE ---
const protect = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token failed' });
    }
};

// --- API ROUTES ---

// 1. Register User (Patient, Doctor, or Admin)
app.post('/api/register', async (req, res) => {
    const { name, email, password, role, department } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'patient',
            department: department || 'General Medicine'
        });

        const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({ token, email: user.email, name: user.name, role: user.role });
    } catch (error) {
    console.error('REGISTER ERROR:', error);
    res.status(500).json({ message: error.message });
}
});

// 2. Login User
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '30d' });
            res.json({ token, email: user.email, name: user.name, role: user.role, department: user.department });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error during login' });
    }
});

// 3. Appointments Management
app.get('/api/appointments', protect, async (req, res) => {
    try {
        const appointments = await Appointment.find({}).sort({ _id: -1 });
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch appointments' });
    }
});

app.post('/api/appointments', protect, async (req, res) => {
    try {
        const { doctorName, date, time, reason } = req.body;
        const newAppt = await Appointment.create({
            patientId: req.user.id,
            patientName: req.user.name,
            doctorName,
            date,
            time,
            reason
        });
        res.status(201).json(newAppt);
    } catch (error) {
        res.status(500).json({ message: 'Failed to book appointment' });
    }
});

app.put('/api/appointments/:id', protect, async (req, res) => {
    try {
        const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update appointment' });
    }
});

// 4. Medical Records & Prescriptions
app.get('/api/records', protect, async (req, res) => {
    try {
        const records = await MedicalRecord.find({}).sort({ _id: -1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch records' });
    }
});

app.post('/api/records', protect, async (req, res) => {
    try {
        if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized: Only doctors can add records' });
        }
        const { patientName, diagnosis, prescription } = req.body;
        const record = await MedicalRecord.create({
            patientName,
            doctorName: req.user.name,
            diagnosis,
            prescription
        });
        res.status(201).json(record);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add medical record' });
    }
});

// 5. Bed / Ward Allocation
app.get('/api/beds', protect, async (req, res) => {
    try {
        const beds = await BedAllocation.find({});
        res.json(beds);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch beds' });
    }
});

app.put('/api/beds/:id', protect, async (req, res) => {
    try {
        const updatedBed = await BedAllocation.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedBed);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update bed allocation' });
    }
});

// 6. Doctors Schedule
app.get('/api/schedules', async (req, res) => {
    try {
        const schedules = await Schedule.find({});
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch schedules' });
    }
});

app.post('/api/schedules', protect, async (req, res) => {
    try {
        const { doctorName, department, days, timeSlot } = req.body;
        const schedule = await Schedule.create({ doctorName, department, days, timeSlot });
        res.status(201).json(schedule);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add schedule' });
    }
});

// 7. User Management (Admin)
app.get('/api/users', protect, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

app.delete('/api/users/:id', protect, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`🏥 Medicare HMS Server running on port ${PORT}`);
});
