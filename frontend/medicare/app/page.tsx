'use client';

import React, { useState, useEffect } from 'react';
import {
  HeartPulse, Stethoscope, Calendar, Users, Clipboard, Bed, Shield, User, LogOut, Plus, Phone, MapPin,
  Trash2, Pencil, AlertTriangle, Settings, Building2, Check, Copy, X, Clock, Mail, ImageOff, ClipboardList
} from 'lucide-react';

const API = 'https://medcare-hospital-csca.onrender.com'; // or http://localhost:5000 for local development

/* ---------- defaults (used until the server answers; admin edits override them) ---------- */
const DEFAULTS: any = {
  siteName: 'Medicare Hospital Management System (HMS)', logoUrl: '', accent: '#0e7490',
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
  hotline: '+254 700 000000', email: 'info@medicare.example', address: 'Nairobi Medical Tower, Kenya',
  footerNote: 'Providing exceptional patient care, modern diagnostics and streamlined digital hospital management.'
};
const NEED_TYPES = ['Consultation', 'Check-up', 'Follow-up visit', 'Specialist referral', 'Lab tests', 'Vaccination', 'Emergency review'];
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STATUS: any = { Pending: 'bg-amber-100 text-amber-800', Confirmed: 'bg-emerald-100 text-emerald-800', Completed: 'bg-sky-100 text-sky-800', Cancelled: 'bg-slate-200 text-slate-600' };

/* ---------- helpers ---------- */
async function call(path: string, method = 'GET', body?: any, token?: string) {
  try {
    const res = await fetch(API + path, {
      method, body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    let data: any = null;
    try { data = await res.json(); } catch { /* empty body */ }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { message: 'Cannot reach the server. It may be waking up, please try again in a few seconds.' } };
  }
}
const store = {
  get: (k: string, d: any = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } }
};
const todayStr = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fmtT = (t: string) => { const h = parseInt(t.slice(0, 2), 10); return `${h % 12 || 12}:${t.slice(3, 5)} ${h < 12 ? 'AM' : 'PM'}`; };
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const parseDays = (s: string): number[] | null => {
  const t = (s || '').toLowerCase();
  const r = t.match(/(sun|mon|tue|wed|thu|fri|sat)[a-z]*\s*(?:-|–|to)\s*(sun|mon|tue|wed|thu|fri|sat)/);
  if (r) {
    const out: number[] = []; let i = DAY_KEYS.indexOf(r[1]); const e = DAY_KEYS.indexOf(r[2]);
    for (let n = 0; n < 7; n++) { out.push(i); if (i === e) break; i = (i + 1) % 7; }
    return out;
  }
  const f = DAY_KEYS.filter(d => t.includes(d)).map(d => DAY_KEYS.indexOf(d));
  return f.length ? f : null;
};
const validPhone = (p: string) => /^\+?[\d\s-]{7,18}$/.test(p.trim());

/* ---------- shared UI ---------- */
const inp = 'fld w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base outline-none';
const btnP = 'bg-acc text-white font-semibold rounded-xl px-5 py-3 min-h-[46px] active:scale-[.98] transition disabled:opacity-50 inline-flex items-center justify-center gap-2';
const btnS = 'border border-slate-300 bg-white text-slate-700 font-semibold rounded-xl px-4 py-2.5 min-h-[42px] active:scale-[.98] transition inline-flex items-center justify-center gap-2';
const btnD = 'border border-rose-200 bg-rose-50 text-rose-700 font-semibold rounded-xl px-4 py-2.5 min-h-[42px] active:scale-[.98] transition inline-flex items-center justify-center gap-2';

const Field = ({ label, children }: any) => (
  <label className="block"><span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>{children}</label>
);
const Card = ({ title, icon: I, children, className = '' }: any) => (
  <section className={`bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 ${className}`}>
    {title && <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900">{I && <I size={20} className="text-acc shrink-0" />}{title}</h3>}
    {children}
  </section>
);
const Empty = ({ children }: any) => <p className="text-slate-500 text-sm py-3">{children}</p>;
const Img = ({ src, alt, className = '' }: any) => {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  if (!src || bad) return <div className={`${className} bg-acc-soft flex items-center justify-center text-acc`}><ImageOff size={28} /></div>;
  return <img src={src} alt={alt} loading="lazy" onError={() => setBad(true)} className={className} />;
};
const Modal = ({ children, onClose }: any) => (
  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
    <div onClick={e => e.stopPropagation()} className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[92vh] overflow-y-auto shadow-2xl">
      {children}
      <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900"><X size={20} /></button>
    </div>
  </div>
);
const DayPicker = ({ value, onChange }: any) => (
  <div className="flex flex-wrap gap-2">
    {WEEK.map(d => {
      const on = value.includes(d);
      return <button type="button" key={d} onClick={() => onChange(on ? value.filter((x: string) => x !== d) : [...value, d])}
        className={`px-3.5 py-2 rounded-full text-sm font-semibold border ${on ? 'bg-acc text-white border-transparent' : 'bg-white text-slate-600 border-slate-300'}`}>{d}</button>;
    })}
  </div>
);
const TabBar = ({ tabs, tab, setTab }: any) => (
  <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 pb-safe md:static md:border-0 md:bg-transparent md:mb-6">
    <div className="flex overflow-x-auto max-w-6xl mx-auto md:gap-2">
      {tabs.map((t: any) => (
        <button key={t.id} onClick={() => setTab(t.id)}
          className={`flex-1 min-w-[4.6rem] flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-3 py-2.5 md:px-4 md:rounded-xl text-[11px] md:text-sm font-semibold whitespace-nowrap ${tab === t.id ? 'text-acc md:!bg-[var(--accent)] md:!text-white' : 'text-slate-500 md:bg-white md:border md:border-slate-200'}`}>
          <t.icon size={20} />{t.label}
        </button>
      ))}
    </div>
  </nav>
);

/* ---------- editable rows (own local state so typing never loses focus) ---------- */
function EmergencyRow({ e, onSave, onDelete }: any) {
  const [d, setD] = useState(e);
  useEffect(() => setD(e), [e]);
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
      <Field label="Illness / case type"><input className={inp} value={d.caseType} onChange={x => setD({ ...d, caseType: x.target.value })} /></Field>
      <Field label="Emergency doctor"><input className={inp} value={d.doctorName} onChange={x => setD({ ...d, doctorName: x.target.value })} /></Field>
      <Field label="Phone"><input className={inp} type="tel" value={d.phone} onChange={x => setD({ ...d, phone: x.target.value })} /></Field>
      <Field label="Notes"><input className={inp} value={d.notes} onChange={x => setD({ ...d, notes: x.target.value })} /></Field>
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="w-5 h-5" checked={d.available} onChange={x => setD({ ...d, available: x.target.checked })} /> Available on call now</label>
      <div className="flex gap-2"><button className={btnP} onClick={() => onSave(d)}><Check size={18} />Save</button><button className={btnD} onClick={() => onDelete(e)}><Trash2 size={18} />Remove</button></div>
    </div>
  );
}
function BedRow({ bed, onUpdate, onDelete }: any) {
  const [p, setP] = useState(bed.patientName === 'Unassigned' ? '' : bed.patientName);
  useEffect(() => setP(bed.patientName === 'Unassigned' ? '' : bed.patientName), [bed]);
  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
      <div className="flex justify-between items-center gap-2">
        <span className="font-bold text-slate-900">{bed.wardName} · {bed.bedNumber}</span>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${bed.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{bed.status}</span>
      </div>
      <input className={inp} placeholder="Assign patient name" value={p} onChange={e => setP(e.target.value)} />
      <div className="flex gap-2">
        <button className={btnP} onClick={() => onUpdate(bed, p.trim() || 'Unassigned', p.trim() ? 'Occupied' : 'Available')}>Update</button>
        <button className={btnS} onClick={() => onUpdate(bed, 'Unassigned', 'Available')}>Free bed</button>
        <button className={btnD} aria-label="Delete bed" onClick={() => onDelete(bed)}><Trash2 size={18} /></button>
      </div>
    </div>
  );
}

/* =================================================================== */
export default function MedicareHMS() {
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<any>(DEFAULTS);
  const [branches, setBranches] = useState<any[]>([]);
  const [emergency, setEmergency] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auth, setAuth] = useState<null | 'login' | 'register'>(null);
  const [toast, setToast] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTabState] = useState('');
  const [codeModal, setCodeModal] = useState<any>(null);
  const [year, setYear] = useState('');

  const [af, setAf] = useState({ name: '', email: '', password: '', phone: '' });
  const emptyBk = { name: '', age: '', phone: '', contactName: '', contactPhone: '', needType: 'Consultation', category: '', scheduleId: '', date: '', time: '', reason: '' };
  const [bk, setBk] = useState<any>(emptyBk);
  const [rec, setRec] = useState<any>({ id: '', appointmentCode: '', patientName: '', diagnosis: '', prescription: '' });
  const [sf, setSf] = useState<any>({ doctorId: '', department: '', days: [], start: '09:00', end: '14:00' });
  const [nu, setNu] = useState({ name: '', email: '', password: '', phone: '', role: 'doctor', department: 'General Medicine' });
  const [nb, setNb] = useState({ wardName: '', bedNumber: '' });
  const emptyBr = { _id: '', name: '', address: '', phone: '', email: '', image: '', mapUrl: '' };
  const [br, setBr] = useState<any>(emptyBr);
  const [sd, setSd] = useState<any>(DEFAULTS);
  const [pw, setPw] = useState({ current: '', next: '' });

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 4500); };
  const setTab = (t: string) => { setTabState(t); if (user) store.set(`hms_tab_${user.role}`, t); window.scrollTo({ top: 0 }); };
  const defaultTab = (r: string) => (r === 'patient' ? 'book' : r === 'doctor' ? 'queue' : 'users');

  /* ---------- data loading ---------- */
  const loadPublic = async () => {
    const r = await call('/api/public');
    if (r.ok) {
      const s = { ...DEFAULTS, ...r.data.settings };
      setSettings(s); setBranches(r.data.branches); setEmergency(r.data.emergency); setSchedules(r.data.schedules);
      store.set('hms_public', { s, b: r.data.branches, e: r.data.emergency, sc: r.data.schedules });
    }
  };
  const loadPrivate = async (u: any) => {
    const get = (p: string) => call(p, 'GET', undefined, u.token);
    const [a, r] = await Promise.all([get('/api/appointments'), get('/api/records')]);
    if (a.status === 401) { logout(); return; }
    if (a.ok) setAppointments(a.data);
    if (r.ok) setRecords(r.data);
    if (u.role === 'admin') {
      const [b, us] = await Promise.all([get('/api/beds'), get('/api/users')]);
      if (b.ok) setBeds(b.data);
      if (us.ok) setUsersList(us.data);
    }
  };
  const refresh = async (u = user) => { await Promise.all([loadPublic(), u ? loadPrivate(u) : null]); };

  useEffect(() => {
    setYear(String(new Date().getFullYear()));
    const c = store.get('hms_public');
    if (c) { setSettings({ ...DEFAULTS, ...c.s }); setBranches(c.b || []); setEmergency(c.e || []); setSchedules(c.sc || []); }
    const u = store.get('hms_user');
    const draft = store.get('hms_booking_draft');
    if (draft) setBk(draft);
    if (u) { setUser(u); setTabState(store.get(`hms_tab_${u.role}`) || defaultTab(u.role)); }
    refresh(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { document.title = settings.siteName; setSd(settings); }, [settings]);
  useEffect(() => { if (user) store.set('hms_booking_draft', bk); }, [bk, user]);
  useEffect(() => { if (user && user.role === 'patient' && !bk.name) setBk((p: any) => ({ ...p, name: user.name, phone: p.phone || user.phone || '' })); }, [user]); // eslint-disable-line

  /* ---------- actions ---------- */
  const logout = () => { setUser(null); store.del('hms_user'); setAppointments([]); setRecords([]); setBeds([]); setUsersList([]); };
  const act = async (path: string, method: string, body?: any, okMsg?: string) => {
    setBusy(true);
    const r = await call(path, method, body, user?.token);
    setBusy(false);
    if (r.status === 401) { logout(); notify('Session expired. Please log in again.', false); return null; }
    if (!r.ok) { notify(r.data?.message || 'Something went wrong', false); return null; }
    if (okMsg) notify(okMsg);
    await refresh();
    return r.data ?? true;
  };

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const reg = auth === 'register';
    const r = await call(reg ? '/api/register' : '/api/login', 'POST', reg ? af : { email: af.email, password: af.password });
    setBusy(false);
    if (!r.ok) return notify(r.data?.message || 'Authentication failed', false);
    const u = { id: r.data.id, name: r.data.name, role: r.data.role, token: r.data.token, phone: r.data.phone || '', email: r.data.email };
    store.set('hms_user', u); setUser(u); setAuth(null); setAf({ name: '', email: '', password: '', phone: '' });
    setTabState(store.get(`hms_tab_${u.role}`) || defaultTab(u.role));
    await refresh(u);
    notify(`Welcome, ${u.name}`);
  };

  const mySched = schedules.find(s => s._id === bk.scheduleId);
  const categoryDoctors = schedules.filter(s => !bk.category || (s.department || '').toLowerCase() === bk.category.toLowerCase());

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const age = Number(bk.age);
    if (!(age >= 0 && age <= 120) || bk.age === '') return notify('Please enter a valid age', false);
    if (!validPhone(bk.phone) || !validPhone(bk.contactPhone)) return notify('Please enter valid phone numbers', false);
    if (!mySched) return notify('Please choose a doctor', false);
    const days = parseDays(mySched.days);
    if (days && !days.includes(new Date(bk.date + 'T00:00:00').getDay())) return notify(`${mySched.doctorName} only works ${mySched.days}. Please pick another date.`, false);
    const d: any = await act('/api/appointments', 'POST', {
      patientName: bk.name, age, phone: bk.phone, contactName: bk.contactName, contactPhone: bk.contactPhone, needType: bk.needType,
      category: mySched.department, doctorId: mySched.doctorId, doctorName: mySched.doctorName, date: bk.date, time: bk.time, reason: bk.reason
    });
    if (d && d.code) {
      setCodeModal(d); setBk({ ...emptyBk, name: user.name }); store.del('hms_booking_draft');
      setTab('appointments');
    }
  };

  const saveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { appointmentCode: rec.appointmentCode, patientName: rec.patientName, diagnosis: rec.diagnosis, prescription: rec.prescription };
    const ok = rec.id ? await act(`/api/records/${rec.id}`, 'PUT', body, 'Record updated') : await act('/api/records', 'POST', body, 'Record saved');
    if (ok) setRec({ id: '', appointmentCode: '', patientName: '', diagnosis: '', prescription: '' });
  };

  const addSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sf.days.length) return notify('Select at least one working day', false);
    if (user.role === 'admin' && !sf.doctorId) return notify('Choose a doctor', false);
    const ok = await act('/api/schedules', 'POST', {
      doctorId: sf.doctorId, department: sf.department || settings.categories[0],
      days: WEEK.filter(d => sf.days.includes(d)).join(', '), timeSlot: `${fmtT(sf.start)} - ${fmtT(sf.end)}`
    }, 'Schedule published');
    if (ok) setSf({ ...sf, days: [] });
  };

  const saveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = br._id ? await act(`/api/branches/${br._id}`, 'PUT', br, 'Branch updated') : await act('/api/branches', 'POST', br, 'Branch added');
    if (ok) setBr(emptyBr);
  };

  const saveSite = async () => {
    const body = { ...sd, categories: Array.isArray(sd.categories) ? sd.categories : String(sd.categories).split(',') };
    setBusy(true);
    const r = await call('/api/settings', 'PUT', body, user.token);
    setBusy(false);
    if (r.ok) { const s = { ...DEFAULTS, ...r.data }; setSettings(s); store.set('hms_public', { ...(store.get('hms_public') || {}), s }); notify('Website updated for everyone'); }
    else notify(r.data?.message || 'Could not save', false);
  };
  const setS = (k: string, v: any) => setSd((p: any) => ({ ...p, [k]: v }));
  const confirmDo = (msg: string, fn: () => void) => { if (window.confirm(msg)) fn(); };

  const copyCode = async (c: string) => { try { await navigator.clipboard.writeText(c); notify('Code copied'); } catch { notify('Copy failed, please note the code down', false); } };

  /* ---------- render helpers ---------- */
  const tabs = user?.role === 'patient'
    ? [{ id: 'book', label: 'Book', icon: Calendar }, { id: 'appointments', label: 'Appointments', icon: Clock }, { id: 'records', label: 'Records', icon: Clipboard }]
    : user?.role === 'doctor'
      ? [{ id: 'queue', label: 'Patients', icon: Users }, { id: 'records', label: 'Diagnosis', icon: Clipboard }, { id: 'schedule', label: 'Schedule', icon: Calendar }]
      : [{ id: 'users', label: 'Users', icon: Users }, { id: 'beds', label: 'Beds', icon: Bed }, { id: 'schedule', label: 'Schedules', icon: Calendar }, { id: 'emergency', label: 'Emergency', icon: AlertTriangle }, { id: 'branches', label: 'Branches', icon: Building2 }, { id: 'site', label: 'Website', icon: Settings }];

  const ApptCard = ({ a, doctorView }: any) => (
    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-slate-900">{doctorView ? a.patientName : a.doctorName}</h4>
          <p className="text-xs text-slate-500">{a.category} · {a.needType}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${STATUS[a.status]}`}>{a.status}</span>
      </div>
      <p className="text-sm text-slate-700">📅 {a.date} at {a.time}</p>
      {doctorView && <p className="text-sm text-slate-700">Age {a.age} · 📞 <a className="underline" href={`tel:${a.phone}`}>{a.phone}</a><br />Contact: {a.contactName} (<a className="underline" href={`tel:${a.contactPhone}`}>{a.contactPhone}</a>)</p>}
      <p className="text-sm text-slate-700"><strong>Reason:</strong> {a.reason}</p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button onClick={() => copyCode(a.code)} className="font-mono text-sm font-bold bg-white border border-dashed border-slate-400 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5">{a.code}<Copy size={14} /></button>
        {doctorView && a.status === 'Pending' && <button className={btnS} onClick={() => act(`/api/appointments/${a._id}`, 'PUT', { status: 'Confirmed' })}>Confirm</button>}
        {doctorView && ['Pending', 'Confirmed'].includes(a.status) && <button className={btnS} onClick={() => act(`/api/appointments/${a._id}`, 'PUT', { status: 'Completed' }, 'Marked completed')}>Complete</button>}
        {doctorView && <button className={btnP} onClick={() => { setRec({ id: '', appointmentCode: a.code, patientName: a.patientName, diagnosis: '', prescription: '' }); setTab('records'); }}>Write record</button>}
        {!doctorView && ['Pending', 'Confirmed'].includes(a.status) && <button className={btnD} onClick={() => confirmDo('Cancel this appointment?', () => act(`/api/appointments/${a._id}`, 'PUT', { status: 'Cancelled' }, 'Appointment cancelled'))}>Cancel</button>}
      </div>
    </div>
  );

  const scheduleForm = (isAdmin: boolean) => (
    <Card title={isAdmin ? 'Publish a doctor schedule' : 'Add to my schedule'} icon={Calendar}>
      <form onSubmit={addSchedule} className="space-y-4">
        {isAdmin && (
          <Field label="Doctor">
            <select className={inp} value={sf.doctorId} onChange={e => setSf({ ...sf, doctorId: e.target.value })} required>
              <option value="">Choose a doctor account</option>
              {usersList.filter(u => u.role === 'doctor').map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Department / category">
          <select className={inp} value={sf.department || settings.categories[0]} onChange={e => setSf({ ...sf, department: e.target.value })}>
            {settings.categories.map((c: string) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Working days"><DayPicker value={sf.days} onChange={(d: string[]) => setSf({ ...sf, days: d })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><input type="time" className={inp} value={sf.start} onChange={e => setSf({ ...sf, start: e.target.value })} required /></Field>
          <Field label="To"><input type="time" className={inp} value={sf.end} onChange={e => setSf({ ...sf, end: e.target.value })} required /></Field>
        </div>
        <button className={`${btnP} w-full`} disabled={busy}><Plus size={18} />Publish schedule</button>
      </form>
    </Card>
  );
  const scheduleList = (mine: boolean) => {
    const list = mine ? schedules.filter(s => s.doctorId === user.id || s.doctorName === user.name) : schedules;
    return (
      <Card title={mine ? 'My published schedule' : 'All doctor schedules'} icon={Clock}>
        {list.length === 0 ? <Empty>No schedules yet.</Empty> : <div className="space-y-3">{list.map(s => (
          <div key={s._id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex justify-between items-center gap-3">
            <div className="min-w-0"><p className="font-bold text-slate-900">{s.doctorName}</p><p className="text-sm text-slate-600">{s.department}</p><p className="text-sm text-slate-600">{s.days} · {s.timeSlot}</p></div>
            <button className={btnD} aria-label="Remove schedule" onClick={() => confirmDo('Remove this schedule?', () => act(`/api/schedules/${s._id}`, 'DELETE', undefined, 'Schedule removed'))}><Trash2 size={18} /></button>
          </div>))}</div>}
      </Card>
    );
  };

  const doctorAppts = appointments;
  const myRecords = records;

  /* ================================================================ */
  return (
    <div className="hms min-h-screen bg-slate-50 text-slate-800" style={{ ['--accent' as any]: settings.accent }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap');
        .hms{font-family:'Figtree',system-ui,sans-serif}
        .bg-acc{background:var(--accent)} .text-acc{color:var(--accent)} .border-acc{border-color:var(--accent)}
        .bg-acc-soft{background:color-mix(in srgb,var(--accent) 10%,white)}
        .fld:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)}
        .pb-safe{padding-bottom:env(safe-area-inset-bottom)}
        html{scroll-behavior:smooth}
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button className="flex items-center gap-3 min-w-0 text-left" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            {settings.logoUrl ? <Img src={settings.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-contain shrink-0" />
              : <span className="bg-acc text-white p-2.5 rounded-xl shrink-0"><HeartPulse size={22} /></span>}
            <span className="font-extrabold text-slate-900 leading-tight text-[15px] sm:text-xl line-clamp-2">{settings.siteName}</span>
          </button>
          {user ? (
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right hidden sm:block"><p className="font-bold text-sm leading-tight">{user.name}</p><span className="text-xs font-semibold bg-acc-soft text-acc px-2 py-0.5 rounded-full capitalize">{user.role}</span></div>
              <button onClick={logout} className={btnD} aria-label="Log out"><LogOut size={18} /><span className="hidden sm:inline">Logout</span></button>
            </div>
          ) : (
            <button onClick={() => setAuth('login')} className={`${btnP} shrink-0`}><User size={18} />Login</button>
          )}
        </div>
      </header>

      <main className={`max-w-6xl mx-auto px-4 ${user ? 'py-5 pb-28 md:pb-10' : 'py-6'}`}>
        {!user ? (
          <div className="space-y-14 sm:space-y-20">
            {/* HERO */}
            <section className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-5">
                <span className="inline-flex items-center gap-2 bg-acc-soft text-acc px-3.5 py-1.5 rounded-full text-sm font-semibold"><Stethoscope size={16} />{settings.badge}</span>
                <h1 className="text-[2rem] sm:text-5xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">{settings.heroTitle}</h1>
                <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl">{settings.heroText}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => setAuth('register')} className={`${btnP} sm:px-8`}>Book an appointment</button>
                  <a href="#emergency" className={`${btnD} sm:px-8`}><AlertTriangle size={18} />Emergency doctors</a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(settings.heroImages || []).slice(0, 3).map((im: any, i: number) => (
                  <figure key={i} className={`relative rounded-2xl overflow-hidden shadow-lg bg-slate-200 ${i === 0 ? 'col-span-2 aspect-[16/10]' : 'aspect-square'}`}>
                    <Img src={im.url} alt={im.caption || 'Hospital'} className="w-full h-full object-cover" />
                    {im.caption && <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 to-transparent text-white text-xs sm:text-sm font-medium p-3 pt-8">{im.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>

            {/* EMERGENCY */}
            <section id="emergency" className="scroll-mt-24">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">Emergency doctors on call</h2>
              <p className="text-slate-600 mb-5">Call straight away for the case that matches your emergency.</p>
              <div className="grid sm:grid-cols-3 gap-4">
                {emergency.length === 0 && <Empty>Emergency contacts will appear here.</Empty>}
                {emergency.map(e => (
                  <div key={e._id} className="bg-white rounded-2xl border border-rose-200 p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2"><h3 className="font-bold text-slate-900">{e.caseType}</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${e.available ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{e.available ? 'On call' : 'Unavailable'}</span></div>
                    <p className="text-sm font-semibold text-slate-800">{e.doctorName}</p>
                    {e.notes && <p className="text-sm text-slate-600">{e.notes}</p>}
                    <a href={`tel:${e.phone || settings.hotline}`} className="mt-2 bg-rose-600 text-white font-semibold rounded-xl px-4 py-3 inline-flex items-center justify-center gap-2 w-full"><Phone size={18} />{e.phone || settings.hotline}</a>
                  </div>
                ))}
              </div>
            </section>

            {/* PORTALS */}
            <section id="services" className="scroll-mt-24 grid md:grid-cols-3 gap-4">
              {(settings.services || []).map((s: any, i: number) => {
                const I = [User, Stethoscope, Shield][i % 3];
                return (
                  <button key={i} onClick={() => setAuth('login')} className="text-left bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-md transition">
                    <span className="bg-acc-soft text-acc w-12 h-12 rounded-xl flex items-center justify-center mb-4"><I size={24} /></span>
                    <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{s.text}</p>
                  </button>
                );
              })}
            </section>

            {/* BRANCHES */}
            {branches.length > 0 && (
              <section id="branches" className="scroll-mt-24">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-5">Our branches</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {branches.map(b => (
                    <article key={b._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <Img src={b.image} alt={b.name} className="w-full h-44 object-cover" />
                      <div className="p-5 space-y-2">
                        <h3 className="font-bold text-lg">{b.name}</h3>
                        <p className="text-sm text-slate-600 flex gap-2"><MapPin size={16} className="shrink-0 mt-0.5 text-acc" />{b.address}</p>
                        {b.phone && <a href={`tel:${b.phone}`} className="text-sm text-slate-700 flex gap-2 items-center"><Phone size={16} className="text-acc" />{b.phone}</a>}
                        {b.email && <a href={`mailto:${b.email}`} className="text-sm text-slate-700 flex gap-2 items-center break-all"><Mail size={16} className="text-acc" />{b.email}</a>}
                        <a target="_blank" rel="noreferrer" href={b.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name + ' ' + b.address)}`} className={`${btnS} w-full mt-2`}>Get directions</a>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <>
            <div className="bg-acc rounded-3xl p-5 sm:p-7 text-white mb-5">
              <h2 className="text-xl sm:text-3xl font-extrabold">{user.role === 'doctor' ? `Doctor’s Portal · ${user.name}` : user.role === 'admin' ? 'Admin Control Center' : `Welcome back, ${user.name}`}</h2>
              <p className="text-white/80 text-sm mt-1">{user.role === 'patient' ? `Patient ID #${String(user.id || '').slice(-6).toUpperCase()}` : user.role === 'doctor' ? 'Manage your patients, diagnoses and clinic schedule.' : 'Full control over users, wards, schedules, branches and website content.'}</p>
            </div>
            <TabBar tabs={tabs} tab={tab} setTab={setTab} />

            {/* ======== PATIENT ======== */}
            {user.role === 'patient' && tab === 'book' && (
              <form onSubmit={submitBooking} className="grid lg:grid-cols-2 gap-5">
                <Card title="Patient details" icon={User} className="space-y-4">
                  <Field label="Patient full name"><input className={inp} value={bk.name} onChange={e => setBk({ ...bk, name: e.target.value })} required /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Age"><input className={inp} type="number" inputMode="numeric" min={0} max={120} value={bk.age} onChange={e => setBk({ ...bk, age: e.target.value })} required /></Field>
                    <Field label="Phone number"><input className={inp} type="tel" inputMode="tel" placeholder="+254…" value={bk.phone} onChange={e => setBk({ ...bk, phone: e.target.value })} required /></Field>
                  </div>
                  <Field label="Contact person’s name"><input className={inp} value={bk.contactName} onChange={e => setBk({ ...bk, contactName: e.target.value })} required /></Field>
                  <Field label="Contact person’s phone"><input className={inp} type="tel" inputMode="tel" value={bk.contactPhone} onChange={e => setBk({ ...bk, contactPhone: e.target.value })} required /></Field>
                </Card>
                <Card title="Choose your doctor and date" icon={Stethoscope} className="space-y-4">
                  <Field label="Type of need">
                    <select className={inp} value={bk.needType} onChange={e => setBk({ ...bk, needType: e.target.value })}>{NEED_TYPES.map(n => <option key={n}>{n}</option>)}</select>
                  </Field>
                  <Field label="Category / department">
                    <select className={inp} value={bk.category} onChange={e => setBk({ ...bk, category: e.target.value, scheduleId: '' })} required>
                      <option value="">Select a category</option>{settings.categories.map((c: string) => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Doctor">
                    <select className={inp} value={bk.scheduleId} onChange={e => setBk({ ...bk, scheduleId: e.target.value })} required disabled={!bk.category}>
                      <option value="">{bk.category ? (categoryDoctors.length ? 'Select a doctor' : 'No doctors in this category yet') : 'Choose a category first'}</option>
                      {categoryDoctors.map(s => <option key={s._id} value={s._id}>{s.doctorName} · {s.days} · {s.timeSlot}</option>)}
                    </select>
                  </Field>
                  {mySched && <p className="text-sm bg-acc-soft text-slate-700 rounded-xl p-3">Available <strong>{mySched.days}</strong>, {mySched.timeSlot}.</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Appointment date"><input className={inp} type="date" min={todayStr()} value={bk.date} onChange={e => setBk({ ...bk, date: e.target.value })} required /></Field>
                    <Field label="Preferred time"><input className={inp} type="time" value={bk.time} onChange={e => setBk({ ...bk, time: e.target.value })} required /></Field>
                  </div>
                  <Field label="Reason for visit"><textarea className={inp} rows={3} placeholder="Briefly describe your symptoms" value={bk.reason} onChange={e => setBk({ ...bk, reason: e.target.value })} required /></Field>
                  <button className={`${btnP} w-full`} disabled={busy}>{busy ? 'Booking…' : 'Confirm booking'}</button>
                </Card>
              </form>
            )}

            {user.role === 'patient' && tab === 'appointments' && (
              <Card title="My appointments" icon={Clock}>
                {appointments.length === 0 ? <Empty>No appointments booked yet.</Empty> : <div className="grid md:grid-cols-2 gap-3">{appointments.map(a => <ApptCard key={a._id} a={a} />)}</div>}
              </Card>
            )}

            {user.role === 'patient' && tab === 'records' && (
              <Card title="Medical records and prescriptions" icon={Clipboard}>
                {myRecords.length === 0 ? <Empty>No medical records yet. They appear here after your doctor updates them.</Empty> : (
                  <div className="grid md:grid-cols-2 gap-3">{myRecords.map(r => (
                    <div key={r._id} className="p-5 rounded-2xl border border-slate-200 bg-acc-soft space-y-3">
                      <div className="flex justify-between text-xs text-slate-600 gap-2"><span className="font-bold text-acc">Dr. {String(r.doctorName).replace(/^Dr\.?\s*/i, '')}</span><span>{r.date}</span></div>
                      <div><p className="text-xs font-semibold text-slate-500">Diagnosis</p><p className="font-semibold text-slate-900">{r.diagnosis}</p></div>
                      <div className="pt-2 border-t border-slate-200"><p className="text-xs font-semibold text-slate-500">Prescription</p><p className="text-sm whitespace-pre-wrap">{r.prescription}</p></div>
                    </div>))}</div>)}
              </Card>
            )}

            {/* ======== DOCTOR ======== */}
            {user.role === 'doctor' && tab === 'queue' && (
              <Card title="My patient appointments" icon={Users}>
                {doctorAppts.length === 0 ? <Empty>No appointments assigned to you yet.</Empty> : <div className="grid md:grid-cols-2 gap-3">{doctorAppts.map(a => <ApptCard key={a._id} a={a} doctorView />)}</div>}
              </Card>
            )}

            {user.role === 'doctor' && tab === 'records' && (
              <div className="grid lg:grid-cols-2 gap-5">
                <Card title={rec.id ? 'Update diagnosis and prescription' : 'Add diagnosis and prescription'} icon={Clipboard}>
                  <form onSubmit={saveRecord} className="space-y-4">
                    {!rec.id && (
                      <Field label="Patient appointment">
                        <select className={inp} value={rec.appointmentCode} onChange={e => { const a = appointments.find(x => x.code === e.target.value); setRec({ ...rec, appointmentCode: e.target.value, patientName: a ? a.patientName : '' }); }}>
                          <option value="">Other patient (type name below)</option>
                          {appointments.map(a => <option key={a._id} value={a.code}>{a.patientName} · {a.code} · {a.date}</option>)}
                        </select>
                      </Field>
                    )}
                    <Field label="Patient name"><input className={inp} value={rec.patientName} onChange={e => setRec({ ...rec, patientName: e.target.value })} readOnly={!!rec.appointmentCode || !!rec.id} required /></Field>
                    <Field label="Diagnosis"><input className={inp} value={rec.diagnosis} onChange={e => setRec({ ...rec, diagnosis: e.target.value })} required /></Field>
                    <Field label="Prescription and notes"><textarea className={inp} rows={4} value={rec.prescription} onChange={e => setRec({ ...rec, prescription: e.target.value })} required /></Field>
                    <div className="flex gap-2"><button className={`${btnP} flex-1`} disabled={busy}>{rec.id ? 'Update record' : 'Save record'}</button>
                      {(rec.id || rec.appointmentCode) && <button type="button" className={btnS} onClick={() => setRec({ id: '', appointmentCode: '', patientName: '', diagnosis: '', prescription: '' })}>Clear</button>}</div>
                  </form>
                </Card>
                <Card title="Records I have written" icon={ClipboardList}>
                  {myRecords.length === 0 ? <Empty>No records yet.</Empty> : <div className="space-y-3 max-h-[560px] overflow-y-auto">{myRecords.map(r => (
                    <div key={r._id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                      <div className="flex justify-between gap-2"><p className="font-bold">{r.patientName}</p><span className="text-xs text-slate-500">{r.date}</span></div>
                      <p className="text-sm"><strong>Dx:</strong> {r.diagnosis}</p><p className="text-sm whitespace-pre-wrap"><strong>Rx:</strong> {r.prescription}</p>
                      <button className={`${btnS} mt-2`} onClick={() => { setRec({ id: r._id, appointmentCode: r.appointmentCode || '', patientName: r.patientName, diagnosis: r.diagnosis, prescription: r.prescription }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={16} />Edit</button>
                    </div>))}</div>}
                </Card>
              </div>
            )}

            {user.role === 'doctor' && tab === 'schedule' && <div className="grid lg:grid-cols-2 gap-5">{scheduleForm(false)}{scheduleList(true)}</div>}

            {/* ======== ADMIN ======== */}
            {user.role === 'admin' && tab === 'users' && (
              <div className="grid lg:grid-cols-3 gap-5">
                <Card title="Add a user" icon={Plus}>
                  <form className="space-y-4" onSubmit={async e => { e.preventDefault(); const ok = await act('/api/users', 'POST', nu, 'User created'); if (ok) setNu({ ...nu, name: '', email: '', password: '', phone: '' }); }}>
                    <Field label="Full name"><input className={inp} value={nu.name} onChange={e => setNu({ ...nu, name: e.target.value })} required /></Field>
                    <Field label="Email"><input className={inp} type="email" value={nu.email} onChange={e => setNu({ ...nu, email: e.target.value })} required /></Field>
                    <Field label="Temporary password (8+ characters)"><input className={inp} type="text" minLength={8} value={nu.password} onChange={e => setNu({ ...nu, password: e.target.value })} required /></Field>
                    <Field label="Phone"><input className={inp} type="tel" value={nu.phone} onChange={e => setNu({ ...nu, phone: e.target.value })} /></Field>
                    <Field label="Role"><select className={inp} value={nu.role} onChange={e => setNu({ ...nu, role: e.target.value })}><option value="doctor">Doctor</option><option value="patient">Patient</option><option value="admin">Admin</option></select></Field>
                    <button className={`${btnP} w-full`} disabled={busy}>Create user</button>
                  </form>
                </Card>
                <Card title={`User management (${usersList.length})`} icon={Users} className="lg:col-span-2">
                  <div className="space-y-3 max-h-[640px] overflow-y-auto">{usersList.map(u => (
                    <div key={u._id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0"><p className="font-bold text-slate-900">{u.name}</p><p className="text-sm text-slate-500 break-all">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p></div>
                      <div className="flex gap-2 items-center">
                        <select className={`${inp} !py-2 !w-auto`} value={u.role} disabled={u._id === user.id} onChange={e => act(`/api/users/${u._id}`, 'PUT', { role: e.target.value }, 'Role updated')}>
                          <option value="patient">Patient</option><option value="doctor">Doctor</option><option value="admin">Admin</option></select>
                        {u._id !== user.id && <button className={btnD} aria-label="Delete user" onClick={() => confirmDo(`Delete ${u.name}?`, () => act(`/api/users/${u._id}`, 'DELETE', undefined, 'User deleted'))}><Trash2 size={18} /></button>}
                      </div>
                    </div>))}</div>
                </Card>
              </div>
            )}

            {user.role === 'admin' && tab === 'beds' && (
              <div className="grid lg:grid-cols-3 gap-5">
                <Card title="Add a bed" icon={Plus}>
                  <form className="space-y-4" onSubmit={async e => { e.preventDefault(); const ok = await act('/api/beds', 'POST', nb, 'Bed added'); if (ok) setNb({ ...nb, bedNumber: '' }); }}>
                    <Field label="Ward name"><input className={inp} placeholder="e.g. ICU" value={nb.wardName} onChange={e => setNb({ ...nb, wardName: e.target.value })} required /></Field>
                    <Field label="Bed number"><input className={inp} placeholder="e.g. ICU-02" value={nb.bedNumber} onChange={e => setNb({ ...nb, bedNumber: e.target.value })} required /></Field>
                    <button className={`${btnP} w-full`} disabled={busy}>Add bed</button>
                  </form>
                </Card>
                <Card title="Bed and ward allocation" icon={Bed} className="lg:col-span-2">
                  {beds.length === 0 ? <Empty>No beds yet.</Empty> : <div className="grid md:grid-cols-2 gap-3">{beds.map(b => (
                    <BedRow key={b._id} bed={b} onUpdate={(bed: any, patientName: string, status: string) => act(`/api/beds/${bed._id}`, 'PUT', { patientName, status }, 'Bed updated')}
                      onDelete={(bed: any) => confirmDo('Delete this bed?', () => act(`/api/beds/${bed._id}`, 'DELETE', undefined, 'Bed removed'))} />))}</div>}
                </Card>
              </div>
            )}

            {user.role === 'admin' && tab === 'schedule' && <div className="grid lg:grid-cols-3 gap-5"><div>{scheduleForm(true)}</div><div className="lg:col-span-2">{scheduleList(false)}</div></div>}

            {user.role === 'admin' && tab === 'emergency' && (
              <Card title="Emergency doctors by illness case" icon={AlertTriangle}>
                <p className="text-sm text-slate-600 mb-4">These appear publicly on the landing page. Three cases are provided; add or remove more if needed.</p>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {emergency.map(e => <EmergencyRow key={e._id} e={e} onSave={(d: any) => act(`/api/emergency/${e._id}`, 'PUT', d, 'Emergency doctor saved')} onDelete={() => confirmDo('Remove this emergency case?', () => act(`/api/emergency/${e._id}`, 'DELETE', undefined, 'Removed'))} />)}
                </div>
                <button className={`${btnS} mt-4`} onClick={() => act('/api/emergency', 'POST', { caseType: 'New emergency case' }, 'Case added')}><Plus size={18} />Add emergency case</button>
              </Card>
            )}

            {user.role === 'admin' && tab === 'branches' && (
              <div className="grid lg:grid-cols-3 gap-5">
                <Card title={br._id ? 'Edit branch' : 'Add a branch'} icon={Building2}>
                  <form className="space-y-4" onSubmit={saveBranch}>
                    <Field label="Branch name"><input className={inp} value={br.name} onChange={e => setBr({ ...br, name: e.target.value })} required /></Field>
                    <Field label="Location / address"><input className={inp} value={br.address} onChange={e => setBr({ ...br, address: e.target.value })} required /></Field>
                    <Field label="Phone"><input className={inp} type="tel" value={br.phone} onChange={e => setBr({ ...br, phone: e.target.value })} /></Field>
                    <Field label="Email"><input className={inp} type="email" value={br.email} onChange={e => setBr({ ...br, email: e.target.value })} /></Field>
                    <Field label="Image URL (online link)"><input className={inp} type="url" placeholder="https://…" value={br.image} onChange={e => setBr({ ...br, image: e.target.value })} /></Field>
                    {br.image && <Img src={br.image} alt="Preview" className="w-full h-36 object-cover rounded-xl" />}
                    <Field label="Google Maps link (optional)"><input className={inp} type="url" value={br.mapUrl} onChange={e => setBr({ ...br, mapUrl: e.target.value })} /></Field>
                    <div className="flex gap-2"><button className={`${btnP} flex-1`} disabled={busy}>{br._id ? 'Save changes' : 'Add branch'}</button>{br._id && <button type="button" className={btnS} onClick={() => setBr(emptyBr)}>Cancel</button>}</div>
                  </form>
                </Card>
                <Card title={`Branches (${branches.length})`} icon={MapPin} className="lg:col-span-2">
                  {branches.length === 0 ? <Empty>No branches yet.</Empty> : <div className="grid md:grid-cols-2 gap-3">{branches.map(b => (
                    <div key={b._id} className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
                      <Img src={b.image} alt={b.name} className="w-full h-32 object-cover" />
                      <div className="p-4 space-y-1"><p className="font-bold">{b.name}</p><p className="text-sm text-slate-600">{b.address}</p><p className="text-sm text-slate-600">{b.phone} {b.email}</p>
                        <div className="flex gap-2 pt-2"><button className={btnS} onClick={() => { setBr({ ...emptyBr, ...b }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={16} />Edit</button>
                          <button className={btnD} aria-label="Delete branch" onClick={() => confirmDo('Delete this branch?', () => act(`/api/branches/${b._id}`, 'DELETE', undefined, 'Branch deleted'))}><Trash2 size={18} /></button></div></div>
                    </div>))}</div>}
                </Card>
              </div>
            )}

            {user.role === 'admin' && tab === 'site' && (
              <div className="space-y-5">
                <div className="grid lg:grid-cols-2 gap-5">
                  <Card title="Institution identity" icon={Settings} className="space-y-4">
                    <Field label="Institution name"><input className={inp} value={sd.siteName} onChange={e => setS('siteName', e.target.value)} /></Field>
                    <Field label="Logo image URL (optional)"><input className={inp} type="url" value={sd.logoUrl || ''} onChange={e => setS('logoUrl', e.target.value)} /></Field>
                    <Field label="Brand colour"><input type="color" className="w-full h-12 rounded-xl border border-slate-300 bg-white p-1" value={sd.accent} onChange={e => setS('accent', e.target.value)} /></Field>
                    <Field label="Appointment categories (comma separated)"><textarea className={inp} rows={3} value={Array.isArray(sd.categories) ? sd.categories.join(', ') : sd.categories} onChange={e => setS('categories', e.target.value.split(','))} /></Field>
                  </Card>
                  <Card title="Landing page text" icon={Pencil} className="space-y-4">
                    <Field label="Welcome badge"><input className={inp} value={sd.badge} onChange={e => setS('badge', e.target.value)} /></Field>
                    <Field label="Headline"><textarea className={inp} rows={2} value={sd.heroTitle} onChange={e => setS('heroTitle', e.target.value)} /></Field>
                    <Field label="Introduction"><textarea className={inp} rows={4} value={sd.heroText} onChange={e => setS('heroText', e.target.value)} /></Field>
                  </Card>
                </div>
                <Card title="Landing page media (online image links)" icon={ImageOff}>
                  <div className="grid md:grid-cols-3 gap-4">
                    {(sd.heroImages || []).map((im: any, i: number) => (
                      <div key={i} className="rounded-2xl border border-slate-200 p-3 space-y-2 bg-slate-50">
                        <Img src={im.url} alt="Preview" className="w-full h-36 object-cover rounded-xl" />
                        <input className={inp} type="url" placeholder="Image URL https://…" value={im.url} onChange={e => setS('heroImages', sd.heroImages.map((x: any, j: number) => j === i ? { ...x, url: e.target.value } : x))} />
                        <input className={inp} placeholder="Caption" value={im.caption} onChange={e => setS('heroImages', sd.heroImages.map((x: any, j: number) => j === i ? { ...x, caption: e.target.value } : x))} />
                        <button className={`${btnD} w-full`} onClick={() => setS('heroImages', sd.heroImages.filter((_: any, j: number) => j !== i))}><Trash2 size={16} />Remove</button>
                      </div>))}
                  </div>
                  <button className={`${btnS} mt-4`} onClick={() => setS('heroImages', [...(sd.heroImages || []), { url: '', caption: '' }])}><Plus size={18} />Add image</button>
                  <p className="text-xs text-slate-500 mt-2">The first three images are shown in the hero section. Use direct image links (ending in .jpg, .png or from sites like Unsplash).</p>
                </Card>
                <Card title="Portal cards" icon={Shield}>
                  <div className="grid md:grid-cols-3 gap-4">{(sd.services || []).map((s: any, i: number) => (
                    <div key={i} className="space-y-2">
                      <input className={inp} value={s.title} onChange={e => setS('services', sd.services.map((x: any, j: number) => j === i ? { ...x, title: e.target.value } : x))} />
                      <textarea className={inp} rows={4} value={s.text} onChange={e => setS('services', sd.services.map((x: any, j: number) => j === i ? { ...x, text: e.target.value } : x))} />
                    </div>))}</div>
                </Card>
                <Card title="Contact details and footer" icon={Phone}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Emergency hotline"><input className={inp} value={sd.hotline} onChange={e => setS('hotline', e.target.value)} /></Field>
                    <Field label="Email"><input className={inp} value={sd.email} onChange={e => setS('email', e.target.value)} /></Field>
                    <Field label="Main address"><input className={inp} value={sd.address} onChange={e => setS('address', e.target.value)} /></Field>
                    <Field label="Footer description"><input className={inp} value={sd.footerNote} onChange={e => setS('footerNote', e.target.value)} /></Field>
                  </div>
                </Card>
                <div className="sticky bottom-20 md:bottom-4 z-30"><button className={`${btnP} w-full shadow-xl`} onClick={saveSite} disabled={busy}>{busy ? 'Saving…' : 'Save website changes'}</button></div>
                <Card title="Change my password" icon={Shield}>
                  <form className="grid sm:grid-cols-3 gap-3 items-end" onSubmit={async e => { e.preventDefault(); const ok = await act('/api/me/password', 'PUT', pw, 'Password changed'); if (ok) setPw({ current: '', next: '' }); }}>
                    <Field label="Current password"><input className={inp} type="password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} required /></Field>
                    <Field label="New password (8+)"><input className={inp} type="password" minLength={8} value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} required /></Field>
                    <button className={btnP} disabled={busy}>Update password</button>
                  </form>
                </Card>
              </div>
            )}
          </>
        )}
      </main>

      {/* AUTH MODAL */}
      {auth && (
        <Modal onClose={() => setAuth(null)}>
          <div className="text-center mb-5"><h3 className="text-2xl font-extrabold text-slate-900">{auth === 'register' ? 'Create patient account' : 'Portal login'}</h3><p className="text-sm text-slate-500 mt-1">Access {settings.siteName} securely</p></div>
          <form onSubmit={submitAuth} className="space-y-4">
            {auth === 'register' && <Field label="Full name"><input className={inp} value={af.name} onChange={e => setAf({ ...af, name: e.target.value })} required /></Field>}
            <Field label="Email address"><input className={inp} type="email" autoComplete="email" value={af.email} onChange={e => setAf({ ...af, email: e.target.value })} required /></Field>
            {auth === 'register' && <Field label="Phone number"><input className={inp} type="tel" value={af.phone} onChange={e => setAf({ ...af, phone: e.target.value })} /></Field>}
            <Field label="Password"><input className={inp} type="password" autoComplete={auth === 'register' ? 'new-password' : 'current-password'} minLength={auth === 'register' ? 8 : undefined} value={af.password} onChange={e => setAf({ ...af, password: e.target.value })} required /></Field>
            {auth === 'register' && <p className="text-xs text-slate-500">Use 8+ characters. Doctor and admin accounts are created by the hospital administrator.</p>}
            <button className={`${btnP} w-full`} disabled={busy}>{busy ? 'Please wait…' : auth === 'register' ? 'Create account' : 'Sign in'}</button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">{auth === 'register' ? 'Already registered?' : 'New patient?'}
            <button className="ml-1 text-acc font-bold" onClick={() => setAuth(auth === 'register' ? 'login' : 'register')}>{auth === 'register' ? 'Sign in' : 'Create account'}</button></p>
        </Modal>
      )}

      {/* APPOINTMENT CODE MODAL */}
      {codeModal && (
        <Modal onClose={() => setCodeModal(null)}>
          <div className="text-center space-y-3">
            <span className="mx-auto w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><Check size={30} /></span>
            <h3 className="text-2xl font-extrabold text-slate-900">Appointment booked</h3>
            <p className="text-sm text-slate-600">Keep this code. Present it at reception when you arrive.</p>
            <button onClick={() => copyCode(codeModal.code)} className="w-full font-mono text-3xl font-extrabold tracking-widest text-acc bg-acc-soft border-2 border-dashed border-acc rounded-2xl py-5 inline-flex items-center justify-center gap-3">{codeModal.code}<Copy size={20} /></button>
            <p className="text-sm text-slate-700">{codeModal.patientName} · {codeModal.doctorName}<br />{codeModal.date} at {codeModal.time}</p>
            <button className={`${btnP} w-full`} onClick={() => setCodeModal(null)}>Done</button>
          </div>
        </Modal>
      )}

      {toast && <div role="status" className={`fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 z-[60] max-w-[92vw] px-5 py-3 rounded-xl text-sm font-semibold shadow-xl text-white ${toast.ok ? 'bg-slate-900' : 'bg-rose-600'}`}>{toast.msg}</div>}

      {/* FOOTER (landing page only, so it never sits under the mobile tab bar) */}
      {!user && (
        <footer className="bg-slate-900 text-slate-400 py-10 mt-16">
          <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8 mb-8">
            <div><h3 className="text-white text-lg font-bold mb-2">{settings.siteName}</h3><p className="text-sm">{settings.footerNote}</p></div>
            <div><h3 className="text-white font-bold mb-2">Quick links</h3><ul className="space-y-2 text-sm">
              <li><a href="#emergency" className="hover:text-white">Emergency doctors</a></li>
              {branches.length > 0 && <li><a href="#branches" className="hover:text-white">Our branches</a></li>}
              <li><button onClick={() => setAuth('login')} className="hover:text-white">Patient, doctor and admin login</button></li></ul></div>
            <div><h3 className="text-white font-bold mb-2">Contact</h3><p className="text-sm flex gap-2"><Phone size={16} className="mt-0.5 shrink-0" />{settings.hotline}</p>
              <p className="text-sm flex gap-2 mt-1"><Mail size={16} className="mt-0.5 shrink-0" />{settings.email}</p>
              <p className="text-sm flex gap-2 mt-1"><MapPin size={16} className="mt-0.5 shrink-0" />{settings.address}</p></div>
          </div>
          <p className="text-center text-xs border-t border-slate-800 pt-6 px-4">&copy; {year} {settings.siteName}. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
}
