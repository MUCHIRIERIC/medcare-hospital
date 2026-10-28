'use client';

import React, { useState, useEffect } from 'react';
import { Stethoscope, Calendar, Users, Clipboard, Bed, Shield, User, LogOut, Plus, CheckCircle, Clock, AlertCircle, HeartPulse, Building2 } from 'lucide-react';

const API_BASE_URL = 'https://nelly-best-collections-4.onrender.com'; // or your local backend url e.g. http://localhost:5000

const authHeaders = (token?: string | null): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

export default function MedicareHMS() {
  const [user, setUser] = useState<{ name: string; role: string; token: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('patient');
  const [department, setDepartment] = useState('General Medicine');

  // App Data States
  const [appointments, setAppointments] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Patient Booking Form
  const [newAppt, setNewAppt] = useState({ doctorName: 'Dr. Sarah Johnson', date: '', time: '', reason: '' });
  
  // Doctor Portal Form
  const [newRecord, setNewRecord] = useState({ patientName: '', diagnosis: '', prescription: '' });
  const [newSchedule, setNewSchedule] = useState({ doctorName: '', department: 'Cardiology', days: 'Mon - Fri', timeSlot: '09:00 AM - 02:00 PM' });

  useEffect(() => {
    const token = localStorage.getItem('medicare_token');
    const storedName = localStorage.getItem('medicare_name');
    const storedRole = localStorage.getItem('medicare_role');
    if (token && storedName && storedRole) {
      setUser({ name: storedName, role: storedRole, token });
    }
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('medicare_token');
      const headers = authHeaders(token);

      const schedRes = await fetch(`${API_BASE_URL}/api/schedules`);
      if (schedRes.ok) setSchedules(await schedRes.json());

      if (token) {
        const apptRes = await fetch(`${API_BASE_URL}/api/appointments`, { headers });
        if (apptRes.ok) setAppointments(await apptRes.json());

        const recRes = await fetch(`${API_BASE_URL}/api/records`, { headers });
        if (recRes.ok) setRecords(await recRes.json());

        const bedRes = await fetch(`${API_BASE_URL}/api/beds`, { headers });
        if (bedRes.ok) setBeds(await bedRes.json());

        const userRes = await fetch(`${API_BASE_URL}/api/users`, { headers });
        if (userRes.ok) setUsersList(await userRes.json());
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isSignUp ? '/api/register' : '/api/login';
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role, department })
      });
      const data = await res.json();
      if (res.ok) {
        setUser({ name: data.name, role: data.role, token: data.token });
        localStorage.setItem('medicare_token', data.token);
        localStorage.setItem('medicare_name', data.name);
        localStorage.setItem('medicare_role', data.role);
        setShowAuthModal(false);
        fetchAllData();
        alert(`Successfully logged in as ${data.role.toUpperCase()}`);
      } else {
        alert(data.message || 'Authentication failed');
      }
    } catch (err) {
      alert('Server connection error');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.clear();
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`
        },
        body: JSON.stringify(newAppt)
      });
      if (res.ok) {
        alert('Appointment booked successfully!');
        setNewAppt({ doctorName: 'Dr. Sarah Johnson', date: '', time: '', reason: '' });
        fetchAllData();
      }
    } catch (err) {
      alert('Failed to book appointment');
    }
  };

  const handleAddMedicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`
        },
        body: JSON.stringify(newRecord)
      });
      if (res.ok) {
        alert('Diagnosis and prescription updated successfully!');
        setNewRecord({ patientName: '', diagnosis: '', prescription: '' });
        fetchAllData();
      }
    } catch (err) {
      alert('Failed to update records');
    }
  };

  const handleBedUpdate = async (bedId: string, patientName: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/beds/${bedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`
        },
        body: JSON.stringify({ patientName, status })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      alert('Failed to update bed status');
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`
        },
        body: JSON.stringify(newSchedule)
      });
      if (res.ok) {
        alert('Doctor schedule added!');
        fetchAllData();
      }
    } catch (err) {
      alert('Failed to add schedule');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="bg-cyan-600 text-white p-2.5 rounded-xl shadow-md">
              <HeartPulse size={28} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">MEDICARE HMS</h1>
              <p className="text-xs text-cyan-600 font-semibold tracking-wider uppercase">Hospital Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="font-bold text-sm text-slate-900">{user.name}</p>
                  <span className="text-xs uppercase bg-cyan-100 text-cyan-800 font-bold px-2 py-0.5 rounded-full">{user.role}</span>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 rounded-xl text-sm font-semibold transition">
                  <LogOut size={18} /> Logout
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-cyan-600/20 transition">
                <User size={18} /> Portal Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!user ? (
          /* --- DYNAMIC LANDING PAGE --- */
          <div className="space-y-16">
            {/* Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 bg-cyan-50 border border-cyan-200 text-cyan-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Stethoscope size={16} /> Welcome to Medicare Center
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight">
                  Advanced Healthcare, <span className="text-cyan-600">Compassionate Healing.</span>
                </h1>
                <p className="text-slate-600 text-lg leading-relaxed">
                  Experience seamless healthcare management. Book appointments with top specialists, access your medical records instantly, and manage hospital workflows effortlessly.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => setShowAuthModal(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-8 py-4 rounded-xl shadow-xl shadow-cyan-600/30 text-center transition">
                    Get Started Now
                  </button>
                  <a href="#services" className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-8 py-4 rounded-xl text-center transition">
                    Explore Portals
                  </a>
                </div>
              </div>

              {/* Required Images on Landing Page */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white h-64">
                    <img 
                      src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80" 
                      alt="Doctor attending to a patient" 
                      className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    />
                  </div>
                  <div className="bg-cyan-900 text-white p-6 rounded-2xl shadow-lg">
                    <h3 className="font-bold text-lg mb-1">24/7 Emergency</h3>
                    <p className="text-cyan-200 text-xs">Always prepared for urgent medical care and ambulance services.</p>
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="bg-gradient-to-br from-cyan-600 to-teal-700 text-white p-6 rounded-2xl shadow-lg">
                    <h3 className="font-bold text-lg mb-1">Expert Doctors</h3>
                    <p className="text-cyan-100 text-xs">Specialized practitioners across all modern departments.</p>
                  </div>
                  <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white h-64">
                    <img 
                      src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80" 
                      alt="Modern hospital facility" 
                      className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Features / Portals Overview */}
            <div id="services" className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition">
                <div className="bg-cyan-50 text-cyan-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                  <User size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">Patient Portal</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Book appointments with preferred specialists, view live medical prescriptions, and track your health progress.</p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition">
                <div className="bg-teal-50 text-teal-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                  <Stethoscope size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">Doctors Portal</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Manage daily schedules, review patient case notes, update accurate diagnoses, and issue digital prescriptions.</p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition">
                <div className="bg-purple-50 text-purple-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                  <Shield size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">Admin Control Center</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Oversee user accounts, allocate hospital beds and wards in real-time, and coordinate department schedules.</p>
              </div>
            </div>
          </div>
        ) : user.role === 'patient' ? (
          /* --- PATIENT DASHBOARD --- */
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-cyan-600 to-teal-600 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-black mb-1">Welcome back, {user.name}!</h2>
                <p className="text-cyan-100 text-sm">Manage your health appointments and view medical prescriptions below.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 text-sm font-bold">
                Patient ID: #{user.token.slice(-6).toUpperCase()}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Book Appointment Card */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 h-fit">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Calendar className="text-cyan-600" /> Book Appointment</h3>
                <form onSubmit={handleBookAppointment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Select Doctor</label>
                    <select 
                      value={newAppt.doctorName}
                      onChange={(e) => setNewAppt({...newAppt, doctorName: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-cyan-500"
                    >
                      {schedules.length > 0 ? (
                        schedules.map((s, idx) => <option key={idx} value={s.doctorName}>{s.doctorName} ({s.department})</option>)
                      ) : (
                        <>
                          <option value="Dr. Sarah Johnson">Dr. Sarah Johnson (Cardiology)</option>
                          <option value="Dr. Michael Vance">Dr. Michael Vance (Neurology)</option>
                          <option value="Dr. Emily Davis">Dr. Emily Davis (Pediatrics)</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Appointment Date</label>
                    <input 
                      type="date" 
                      value={newAppt.date}
                      onChange={(e) => setNewAppt({...newAppt, date: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-cyan-500"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Time Slot</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 10:00 AM"
                      value={newAppt.time}
                      onChange={(e) => setNewAppt({...newAppt, time: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-cyan-500"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Reason for Visit</label>
                    <textarea 
                      rows={3}
                      placeholder="Briefly describe symptoms or checkup type"
                      value={newAppt.reason}
                      onChange={(e) => setNewAppt({...newAppt, reason: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-cyan-500"
                      required 
                    />
                  </div>
                  <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-600/20 transition">
                    Confirm Booking
                  </button>
                </form>
              </div>

              {/* Appointments & Medical Records List */}
              <div className="lg:col-span-2 space-y-8">
                {/* My Appointments */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Clock className="text-cyan-600" /> My Appointments</h3>
                  <div className="space-y-4">
                    {appointments.filter(a => a.patientName === user.name).length === 0 ? (
                      <p className="text-slate-500 text-sm py-4">No appointments booked yet.</p>
                    ) : (
                      appointments.filter(a => a.patientName === user.name).map((appt) => (
                        <div key={appt._id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <h4 className="font-bold text-slate-900">{appt.doctorName}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">📅 {appt.date} at {appt.time}</p>
                            <p className="text-sm text-slate-700 mt-2"><strong className="text-slate-900">Reason:</strong> {appt.reason}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            appt.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : 
                            appt.status === 'Completed' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {appt.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Medical Records & Prescriptions */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Clipboard className="text-cyan-600" /> Medical Records & Prescriptions</h3>
                  <div className="space-y-4">
                    {records.filter(r => r.patientName.toLowerCase() === user.name.toLowerCase()).length === 0 ? (
                      <p className="text-slate-500 text-sm py-4">No medical records or prescriptions found.</p>
                    ) : (
                      records.filter(r => r.patientName.toLowerCase() === user.name.toLowerCase()).map((rec) => (
                        <div key={rec._id} className="p-6 rounded-2xl border border-cyan-100 bg-cyan-50/50 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-cyan-700">Attending: {rec.doctorName}</span>
                            <span className="text-xs text-slate-500">{rec.date}</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Diagnosis</p>
                            <p className="text-slate-900 font-semibold">{rec.diagnosis}</p>
                          </div>
                          <div className="pt-2 border-t border-cyan-100">
                            <p className="text-xs font-bold text-slate-500 uppercase">Prescription</p>
                            <p className="text-cyan-900 font-medium text-sm">{rec.prescription}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : user.role === 'doctor' ? (
          /* --- DOCTORS PORTAL --- */
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-3xl p-8 text-white shadow-xl">
              <h2 className="text-3xl font-black mb-1">Doctor's Portal - {user.name}</h2>
              <p className="text-teal-100 text-sm">Manage your clinic schedule, view patient appointments, and update medical diagnoses.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Update Diagnosis & Prescriptions */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Clipboard className="text-teal-600" /> Update Patient Diagnosis & Prescription</h3>
                <form onSubmit={handleAddMedicalRecord} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Patient Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. John Doe"
                      value={newRecord.patientName}
                      onChange={(e) => setNewRecord({...newRecord, patientName: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-teal-500"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Diagnosis</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Acute Bronchitis"
                      value={newRecord.diagnosis}
                      onChange={(e) => setNewRecord({...newRecord, diagnosis: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-teal-500"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Prescription & Notes</label>
                    <textarea 
                      rows={3}
                      placeholder="e.g. Amoxicillin 500mg 3x daily for 7 days"
                      value={newRecord.prescription}
                      onChange={(e) => setNewRecord({...newRecord, prescription: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-teal-500"
                      required 
                    />
                  </div>
                  <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-600/20 transition">
                    Save Medical Record
                  </button>
                </form>
              </div>

              {/* Patient Appointments Overview */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Calendar className="text-teal-600" /> Patient Appointments Queue</h3>
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                  {appointments.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4">No appointments found.</p>
                  ) : (
                    appointments.map((appt) => (
                      <div key={appt._id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-slate-900">{appt.patientName}</h4>
                          <p className="text-xs text-slate-500">📅 {appt.date} | ⏰ {appt.time}</p>
                          <p className="text-xs text-slate-600 mt-1">Reason: {appt.reason}</p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-800">{appt.status}</span>
                          {appt.status !== 'Completed' && (
                            <button 
                              onClick={async () => {
                                await fetch(`${API_BASE_URL}/api/appointments/${appt._id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
                                  body: JSON.stringify({ status: 'Completed' })
                                });
                                fetchAllData();
                              }}
                              className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg font-semibold hover:bg-emerald-700"
                            >
                              Mark Completed
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* --- ADMIN CONTROL CENTER --- */
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 rounded-3xl p-8 text-white shadow-xl flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black mb-1">Admin Control Center</h2>
                <p className="text-purple-200 text-sm">Full oversight of hospital users, bed allocations, and doctor schedules.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Add Doctor Schedule & Controls */}
              <div className="space-y-8">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Calendar className="text-purple-600" /> Manage Doctor Schedule</h3>
                  <form onSubmit={handleAddSchedule} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Doctor Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Dr. Robert Fox"
                        value={newSchedule.doctorName}
                        onChange={(e) => setNewSchedule({...newSchedule, doctorName: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-purple-500"
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Department</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Cardiology"
                        value={newSchedule.department}
                        onChange={(e) => setNewSchedule({...newSchedule, department: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-purple-500"
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Days Available</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Mon, Wed, Fri"
                        value={newSchedule.days}
                        onChange={(e) => setNewSchedule({...newSchedule, days: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-purple-500"
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Time Slot</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 08:00 AM - 01:00 PM"
                        value={newSchedule.timeSlot}
                        onChange={(e) => setNewSchedule({...newSchedule, timeSlot: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-purple-500"
                        required 
                      />
                    </div>
                    <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-600/20 transition">
                      Publish Schedule
                    </button>
                  </form>
                </div>
              </div>

              {/* Bed / Ward Allocation Center */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Bed className="text-purple-600" /> Bed & Ward Allocation</h3>
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                  {beds.map((bed) => (
                    <div key={bed._id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{bed.wardName} - {bed.bedNumber}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${bed.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {bed.status}
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input 
                          type="text" 
                          defaultValue={bed.patientName} 
                          id={`patient-${bed._id}`}
                          placeholder="Assign patient name" 
                          className="w-full text-xs p-2 border rounded-lg bg-white"
                        />
                        <button 
                          onClick={() => {
                            const inputVal = (document.getElementById(`patient-${bed._id}`) as HTMLInputElement).value;
                            handleBedUpdate(bed._id, inputVal || 'Unassigned', inputVal ? 'Occupied' : 'Available');
                          }}
                          className="text-xs bg-slate-900 text-white px-3 py-2 rounded-lg font-semibold hover:bg-slate-800 whitespace-nowrap"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Management */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Users className="text-purple-600" /> User Management</h3>
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                  {usersList.map((u) => (
                    <div key={u._id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center text-sm">
                      <div>
                        <p className="font-bold text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                        <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">{u.role}</span>
                      </div>
                      {u.role !== 'admin' && (
                        <button 
                          onClick={async () => {
                            if (window.confirm(`Delete user ${u.name}?`)) {
                              await fetch(`${API_BASE_URL}/api/users/${u._id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${user.token}` }
                              });
                              fetchAllData();
                            }
                          }}
                          className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-1"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 relative shadow-2xl">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 font-bold">✕</button>
            
            <div className="text-center mb-6">
              <h3 className="text-2xl font-black text-slate-900">{isSignUp ? 'Create Account' : 'Portal Login'}</h3>
              <p className="text-xs text-slate-500 mt-1">Access Medicare HMS securely</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-cyan-500"
                    required 
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-cyan-500"
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-cyan-500"
                  required 
                />
              </div>

              {isSignUp && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Select Role</label>
                    <select 
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-cyan-500 font-semibold text-cyan-700"
                    >
                      <option value="patient">Patient</option>
                      <option value="doctor">Doctor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {role === 'doctor' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Department</label>
                      <input 
                        type="text" 
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-cyan-500"
                        required 
                      />
                    </div>
                  )}
                </>
              )}

              <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-600/20 transition mt-2">
                {isSignUp ? 'Register Account' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-slate-500">{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
              <button onClick={() => setIsSignUp(!isSignUp)} className="ml-1 text-cyan-600 font-bold hover:underline">
                {isSignUp ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-20 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-white text-lg font-bold mb-3">Medicare HMS</h3>
            <p className="text-sm">Providing exceptional patient care, modern diagnostics, and streamlined digital hospital management workflows.</p>
          </div>
          <div>
            <h3 className="text-white text-md font-bold mb-3">Quick Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="hover:text-cyan-400">Home Portal</button></li>
              <li><button onClick={() => setShowAuthModal(true)} className="hover:text-cyan-400">Patient & Doctor Login</button></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white text-md font-bold mb-3">Emergency Contact</h3>
            <p className="text-sm">📞 Hotline: +254 700 000000</p>
            <p className="text-sm mt-1">📍 Location: Nairobi Medical Tower, Kenya</p>
          </div>
        </div>
        <div className="text-center text-xs border-t border-slate-800 pt-6">
          &copy; {new Date().getFullYear()} Medicare Hospital Management System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
