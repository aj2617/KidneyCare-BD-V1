import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Users, Activity, Star, Settings, MapPin, CheckCircle2,
  Loader2, Navigation, RefreshCw, ChevronRight,
  Award, AlertTriangle, Clock, Plus, Search, LogOut,
  Wifi, WifiOff, Globe, Droplets, Heart, UserCircle,
  CalendarDays, CalendarPlus, Send, Trash2, CheckSquare, X
} from 'lucide-react';

// ── IndexedDB offline queue ──────────────────────────────────────────────────
const IDB_NAME = 'kidneycare-chw-v1';
const STORE = 'pendingVisits';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE))
        db.createObjectStore(STORE, { keyPath: 'localId', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function queueVisit(visit: object) {
  const db = await openIDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({ ...visit, queuedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function getPendingVisits(): Promise<any[]> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function removePendingVisit(localId: number) {
  const db = await openIDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(localId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Plausibility validation ──────────────────────────────────────────────────
function validateVitals(v: any): string[] {
  const errors: string[] = [];
  const s = Number(v.systolic), d = Number(v.diastolic);
  if (v.systolic && (s < 60 || s > 280)) errors.push('সিস্টোলিক BP ৬০–২৮০ mmHg');
  if (v.diastolic && (d < 40 || d > 150)) errors.push('ডায়াস্টোলিক BP ৪০–১৫০ mmHg');
  if (v.systolic && v.diastolic && d >= s) errors.push('সিস্টোলিক > ডায়াস্টোলিক হতে হবে');
  const bs = Number(v.blood_sugar);
  if (v.blood_sugar && (bs < 1 || bs > 60)) errors.push('রক্তের শর্করা ১–৬০ mmol/L');
  const cr = Number(v.creatinine);
  if (v.creatinine && (cr < 0.2 || cr > 20)) errors.push('ক্রিয়েটিনিন ০.২–২০ mg/dL');
  const wt = Number(v.weight);
  if (v.weight && (wt < 20 || wt > 250)) errors.push('ওজন ২০–২৫০ কেজি');
  return errors;
}

// ── Urgency helpers ──────────────────────────────────────────────────────────
type Urgency = 'overdue' | 'due-soon' | 'done';
function getUrgency(patient: any, lastVisitMap: Record<number, Date | null>): Urgency {
  const last = lastVisitMap[patient.id];
  const days = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : 999;
  const risk = patient.risk_score || 0;
  if (risk > 75 || days > 14) return 'overdue';
  if (risk > 50 || days > 7) return 'due-soon';
  return 'done';
}
const urgencyOrder: Record<Urgency, number> = { overdue: 0, 'due-soon': 1, done: 2 };
const urgencyStyle: Record<Urgency, string> = {
  overdue: 'border',
  'due-soon': 'border',
  done: 'border',
};
const urgencyStyleInline: Record<Urgency, { background: string; color: string; borderColor: string }> = {
  overdue: { background: '#FDECEA', color: '#7b1a1a', borderColor: '#E74C3C' },
  'due-soon': { background: '#FEF5E7', color: '#7d5100', borderColor: '#F39C12' },
  done: { background: '#EAFAF1', color: '#1a7a44', borderColor: '#2ECC71' },
};
const urgencyDot: Record<Urgency, string> = {
  overdue: 'bg-[#E74C3C]',
  'due-soon': 'bg-[#F39C12]',
  done: 'bg-[#2ECC71]',
};

// ── Badges ───────────────────────────────────────────────────────────────────
interface Badge { id: string; icon: string; en: string; bn: string; check: (p: any, vcount: number, pcount: number) => boolean }
const BADGES: Badge[] = [
  { id: 'first', icon: '🏃', en: 'First Visit', bn: 'প্রথম ভিজিট', check: (_p, v) => v >= 1 },
  { id: 'ten', icon: '⭐', en: '10 Visits', bn: '১০ ভিজিট', check: (_p, v) => v >= 10 },
  { id: 'fifty', icon: '🌟', en: '50 Visits', bn: '৫০ ভিজিট', check: (_p, v) => v >= 50 },
  { id: 'pts100', icon: '🥉', en: '100 Points', bn: '১০০ পয়েন্ট', check: (p) => (p?.points || 0) >= 100 },
  { id: 'pts500', icon: '🥈', en: '500 Points', bn: '৫০০ পয়েন্ট', check: (p) => (p?.points || 0) >= 500 },
  { id: 'pts1000', icon: '🥇', en: '1000 Points', bn: '১০০০ পয়েন্ট', check: (p) => (p?.points || 0) >= 1000 },
  { id: 'roster', icon: '👥', en: 'Full Roster', bn: 'পূর্ণ তালিকা', check: (_p, _v, pc) => pc >= 30 },
  { id: 'guardian', icon: '🛡️', en: 'Guardian', bn: 'অভিভাবক', check: (p) => (p?.streak_days || 0) >= 7 },
];

interface Props { tab?: string }

export default function CHWDashboard({ tab = 'chw-home' }: Props) {
  const { token, user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const bn = language === 'bn';

  const [profile, setProfile] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [visitType, setVisitType] = useState('routine');
  const [notes, setNotes] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: string; lng: string } | null>(null);
  const [gpsState, setGpsState] = useState<'idle' | 'getting' | 'got' | 'error'>('idle');
  const [vitals, setVitals] = useState({ systolic: '', diastolic: '', blood_sugar: '', creatinine: '', weight: '', edema: false, fatigue: 5, urine_protein: 'Negative' });
  const [showVitals, setShowVitals] = useState(false);
  const [validErrors, setValidErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [search, setSearch] = useState('');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [selectedPatientDetail, setSelectedPatientDetail] = useState<any>(null);
  const [scheduledVisits, setScheduledVisits] = useState<any[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedPatient, setSchedPatient] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedType, setSchedType] = useState('routine');
  const [schedReason, setSchedReason] = useState('');
  const [schedSubmitting, setSchedSubmitting] = useState(false);
  const [schedMsg, setSchedMsg] = useState('');
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [summaryId, setSummaryId] = useState<number | null>(null);
  const [summaryText, setSummaryText] = useState('');
  const [summarySubmitting, setSummarySubmitting] = useState(false);

  // Build lastVisit map
  const lastVisitMap: Record<number, Date | null> = {};
  visits.forEach(v => {
    const d = new Date(v.timestamp);
    if (!lastVisitMap[v.patient_id] || d > lastVisitMap[v.patient_id]!)
      lastVisitMap[v.patient_id] = d;
  });

  const visitCount = visits.length;
  const patientCount = patients.length;

  useEffect(() => {
    const on = () => { setIsOnline(true); syncPending(); };
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [token]);

  useEffect(() => { fetchData(); refreshPending(); }, []);

  const refreshPending = async () => {
    const p = await getPendingVisits();
    setPendingCount(p.length);
  };

  const fetchData = async () => {
    setIsLoading(true);
    const h = { Authorization: `Bearer ${token}` };
    try {
      const [pr, pat, all, vis, lb, sv] = await Promise.all([
        fetch('/api/chw/profile', { headers: h }),
        fetch('/api/chw/patients', { headers: h }),
        fetch('/api/chw/all-patients', { headers: h }),
        fetch('/api/chw/visits', { headers: h }),
        fetch('/api/chw/leaderboard', { headers: h }),
        fetch('/api/chw/scheduled-visits', { headers: h }),
      ]);
      if (pr.ok) setProfile(await pr.json());
      if (pat.ok) setPatients(await pat.json());
      if (all.ok) setAllPatients(await all.json());
      if (vis.ok) setVisits(await vis.json());
      if (lb.ok) setLeaderboard(await lb.json());
      if (sv.ok) { const d = await sv.json(); setScheduledVisits(Array.isArray(d) ? d : []); }
    } catch { /* offline graceful */ }
    finally { setIsLoading(false); }
  };

  const syncPending = async () => {
    const pending = await getPendingVisits();
    if (!pending.length) return;
    setIsSyncing(true);
    setSyncMsg(bn ? 'সিঙ্ক হচ্ছে...' : 'Syncing...');
    let synced = 0;
    for (const visit of pending) {
      try {
        const { localId, queuedAt, ...payload } = visit;
        const r = await fetch('/api/chw/log-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (r.ok) { await removePendingVisit(localId); synced++; }
      } catch { /* skip */ }
    }
    setIsSyncing(false);
    if (synced > 0) {
      setSyncMsg(bn ? `${synced}টি ভিজিট সিঙ্ক হয়েছে ✓` : `${synced} visit(s) synced ✓`);
      refreshPending(); fetchData();
      setTimeout(() => setSyncMsg(''), 4000);
    } else { setSyncMsg(''); }
  };

  const getGPS = () => {
    setGpsState('getting');
    navigator.geolocation.getCurrentPosition(
      pos => { setGpsCoords({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }); setGpsState('got'); },
      () => setGpsState('error'),
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const submitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    const errs = showVitals ? validateVitals(vitals) : [];
    if (errs.length) { setValidErrors(errs); return; }
    setValidErrors([]);
    setIsSubmitting(true);

    const payload: any = {
      patient_id: selectedPatient.id,
      lat: gpsCoords?.lat ? parseFloat(gpsCoords.lat) : null,
      lng: gpsCoords?.lng ? parseFloat(gpsCoords.lng) : null,
      visit_type: visitType,
      notes,
    };
    if (showVitals) payload.vitals = vitals;

    const tryOnline = async () => {
      const r = await fetch('/api/chw/log-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      return r.ok;
    };

    let saved = false;
    if (isOnline) {
      try { saved = await tryOnline(); } catch { /* fall through to queue */ }
    }

    if (!saved) {
      await queueVisit(payload);
      await refreshPending();
      setSubmitMsg(bn ? '✓ অফলাইনে সংরক্ষিত। অনলাইনে এলে সিঙ্ক হবে।' : '✓ Saved offline. Will sync when connected.');
    } else {
      setSubmitMsg(bn ? '✓ ভিজিট সফলভাবে লগ হয়েছে! +১০ পয়েন্ট' : '✓ Visit logged! +10 points');
      fetchData();
    }

    setSelectedPatient(null); setNotes(''); setGpsCoords(null); setGpsState('idle');
    setVitals({ systolic: '', diastolic: '', blood_sugar: '', creatinine: '', weight: '', edema: false, fatigue: 5, urine_protein: 'Negative' });
    setShowVitals(false);
    setIsSubmitting(false);
    setTimeout(() => setSubmitMsg(''), 5000);
  };

  const assignPatient = async (pid: number) => {
    const r = await fetch('/api/chw/assign-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ patient_id: pid }),
    });
    if (r.ok) { fetchData(); }
  };

  const getRiskBadge = (score: number): string => {
    if (score > 75) return 'bg-[#FDECEA] text-[#7b1a1a] border border-[#E74C3C]';
    if (score > 50) return 'bg-[#FEF5E7] text-[#7d5100] border border-[#F39C12]';
    if (score > 25) return 'bg-[#FEF5E7] text-[#7d5100] border border-[#F39C12]';
    return 'bg-[#EAFAF1] text-[#1a7a44] border border-[#2ECC71]';
  };
  const getRiskScoreColor = (score: number): string => {
    if (score > 75) return 'text-[#E74C3C]';
    if (score > 50) return 'text-[#F39C12]';
    if (score > 25) return 'text-[#F39C12]';
    return 'text-[#2ECC71]';
  };

  const getRiskLabel = (score: number) => {
    if (score > 75) return bn ? 'মারাত্মক' : 'Critical';
    if (score > 50) return bn ? 'উচ্চ' : 'High';
    if (score > 25) return bn ? 'মাঝারি' : 'Moderate';
    return bn ? 'কম' : 'Low';
  };

  const getDaysSince = (patientId: number) => {
    const last = lastVisitMap[patientId];
    if (!last) return null;
    return Math.floor((Date.now() - last.getTime()) / 86400000);
  };

  // Sort patients by urgency
  const sortedPatients = [...patients].sort((a, b) => {
    const ua = urgencyOrder[getUrgency(a, lastVisitMap)];
    const ub = urgencyOrder[getUrgency(b, lastVisitMap)];
    if (ua !== ub) return ua - ub;
    return (b.risk_score || 0) - (a.risk_score || 0);
  });

  const filteredPatients = sortedPatients.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.district?.toLowerCase().includes(search.toLowerCase())
  );

  const unassigned = allPatients.filter(p => !patients.find(my => my.id === p.id));

  const earnedBadges = BADGES.filter(b => b.check(profile, visitCount, patientCount));
  const lockedBadges = BADGES.filter(b => !b.check(profile, visitCount, patientCount));

  const myRank = leaderboard.findIndex(l => l.name === user?.name) + 1;
  const nextMilestone = [100, 250, 500, 1000, 2000].find(m => m > (profile?.points || 0)) || 2000;
  const progress = Math.min(100, ((profile?.points || 0) / nextMilestone) * 100);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" />
        <p className="text-slate-500 text-sm">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
      </div>
    );
  }

  // ── Patient detail modal ─────────────────────────────────────────────────
  if (selectedPatientDetail) {
    const p = selectedPatientDetail;
    const urgency = getUrgency(p, lastVisitMap);
    const days = getDaysSince(p.id);
    const recentVisits = visits.filter(v => v.patient_id === p.id).slice(0, 5);
    return (
      <div className="min-h-screen bg-[#F4F7FB]">
        <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setSelectedPatientDetail(null)} className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900 text-lg">{p.name}</h2>
            <p className="text-xs text-slate-500">{p.district} · Stage {p.ckd_stage || '--'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${urgencyStyle[urgency]}`} style={urgencyStyleInline[urgency]}>
            {urgency === 'overdue' ? (bn ? 'মেয়াদ পেরিয়েছে' : 'Overdue') : urgency === 'due-soon' ? (bn ? 'শীঘ্রই দেখুন' : 'Due Soon') : (bn ? 'সম্পন্ন' : 'Done')}
          </span>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
              <p className={`text-2xl font-black ${getRiskScoreColor(p.risk_score || 0)}`}>{p.risk_score || 0}</p>
              <p className="text-xs text-slate-500 mt-1">{bn ? 'ঝুঁকি স্কোর' : 'Risk Score'}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
              <p className="text-2xl font-black text-slate-800">{p.age || '--'}</p>
              <p className="text-xs text-slate-500 mt-1">{bn ? 'বয়স' : 'Age'}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
              <p className="text-2xl font-black text-slate-800">{days !== null ? days : '—'}</p>
              <p className="text-xs text-slate-500 mt-1">{bn ? 'দিন আগে' : 'Days ago'}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1A6B8A]" />
              {bn ? 'সাম্প্রতিক ভিজিট' : 'Recent Visits'}
            </h3>
            {recentVisits.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">{bn ? 'কোনো ভিজিট নেই' : 'No visits yet'}</p>
            ) : recentVisits.map(v => (
              <div key={v.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-800 capitalize">{v.visit_type}</p>
                  <p className="text-xs text-slate-500">{new Date(v.timestamp).toLocaleDateString(bn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                {v.lat && <span className="text-xs flex items-center gap-1" style={{ color: '#2ECC71' }}><MapPin className="w-3 h-3" />GPS</span>}
              </div>
            ))}
          </div>
          <button
            onClick={() => { setSelectedPatientDetail(null); setSelectedPatient(p); window.dispatchEvent(new CustomEvent('navigate', { detail: 'chw-vitals' })); }}
            className="w-full py-4 bg-[#1A6B8A] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:bg-[#14556e] transition-colors"
          >
            <Activity className="w-5 h-5" />
            {bn ? 'ভিজিট লগ করুন' : 'Log Visit'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-2">

      {/* ── TEAL HEADER ── */}
      <div
        className="px-4 pt-8 pb-4"
        style={{ background: '#1A6B8A', borderRadius: '0 0 1.5rem 1.5rem' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60 mb-0.5">
              {bn ? 'কমিউনিটি স্বাস্থ্যকর্মী' : 'Community Health Worker'}
            </p>
            <h1 className="text-lg font-black text-white tracking-tight">
              {user?.name?.split(' ')[0] || (bn ? 'CHW' : 'CHW')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="px-2.5 py-1.5 bg-white/10 border border-white/20 text-white text-xs font-bold rounded-xl hover:bg-white/20 transition-all"
            >
              {language === 'en' ? 'বাং' : 'EN'}
            </button>
            <button
              onClick={logout}
              className="p-2 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all"
              title={bn ? 'লগআউট' : 'Logout'}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sync / offline banner */}
      {(!isOnline || isSyncing || syncMsg || pendingCount > 0) && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white" style={{ background: !isOnline ? '#F39C12' : '#1A6B8A' }}>
          {!isOnline ? <WifiOff className="w-4 h-4 flex-shrink-0" /> : isSyncing ? <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" /> : <Wifi className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1">
            {!isOnline
              ? (bn ? 'অফলাইন — ডেটা সংরক্ষিত থাকবে' : 'Offline — data will be saved locally')
              : syncMsg || (pendingCount > 0 ? (bn ? `${pendingCount}টি ভিজিট পেন্ডিং` : `${pendingCount} visit(s) pending sync`) : '')}
          </span>
          {isOnline && pendingCount > 0 && !isSyncing && (
            <button onClick={syncPending} className="px-2 py-0.5 bg-white/20 rounded-lg text-xs font-bold">
              {bn ? 'সিঙ্ক' : 'Sync'}
            </button>
          )}
        </div>
      )}

      {/* Submit feedback */}
      {submitMsg && (
        <div className="mx-4 mt-3 p-3 rounded-2xl text-sm font-semibold flex items-center gap-2" style={{ background: '#EAFAF1', border: '1px solid #2ECC71', color: '#1a7a44' }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {submitMsg}
        </div>
      )}

      {/* ── HOME TAB ─────────────────────────────────────────────────────── */}
      {tab === 'chw-home' && (
        <div className="px-4 pt-4 space-y-4">
          {/* Header stats */}
          <div className="flex gap-3">
            <div className="flex-1 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4" style={{ color: '#F39C12' }} />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{bn ? 'পয়েন্ট' : 'Points'}</span>
              </div>
              <p className="text-3xl font-black" style={{ color: '#F39C12' }}>{profile?.points || 0}</p>
              {myRank > 0 && <p className="text-xs text-slate-400 mt-0.5">#{myRank} {bn ? 'র‍্যাঙ্ক' : 'rank'}</p>}
            </div>
            <div className="flex-1 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-[#1A6B8A]" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{bn ? 'রোগী' : 'Patients'}</span>
              </div>
              <p className="text-3xl font-black text-[#1A6B8A]">{patientCount}<span className="text-lg text-slate-400">/30</span></p>
              <p className="text-xs text-slate-400 mt-0.5">{visitCount} {bn ? 'ভিজিট' : 'visits'}</p>
            </div>
          </div>

          {/* Follow-up summary */}
          {patients.length > 0 && (() => {
            const overdue = patients.filter(p => getUrgency(p, lastVisitMap) === 'overdue').length;
            const soon = patients.filter(p => getUrgency(p, lastVisitMap) === 'due-soon').length;
            return overdue + soon > 0 ? (
              <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: '#FDECEA', border: '1px solid #E74C3C' }}>
                <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#E74C3C' }} />
                <p className="text-sm font-semibold" style={{ color: '#7b1a1a' }}>
                  {overdue > 0 && `${overdue} ${bn ? 'জন মেয়াদ পেরিয়েছে' : 'overdue'}${soon > 0 ? ', ' : ''}`}
                  {soon > 0 && `${soon} ${bn ? 'জন শীঘ্রই দেখুন' : 'due soon'}`}
                </p>
              </div>
            ) : null;
          })()}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder={bn ? 'রোগীর নাম বা জেলা খুঁজুন...' : 'Search patient or district...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
            />
          </div>

          {/* Patient list */}
          {filteredPatients.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">{bn ? 'কোনো রোগী নেই' : 'No patients yet'}</p>
              <button onClick={() => setShowAddPatient(true)} className="mt-3 px-4 py-2 bg-[#1A6B8A] text-white rounded-xl text-sm font-bold">
                {bn ? 'রোগী যোগ করুন' : 'Add Patients'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPatients.map(p => {
                const urgency = getUrgency(p, lastVisitMap);
                const days = getDaysSince(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatientDetail(p)}
                    className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 active:bg-slate-50 transition-colors text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#1A6B8A]/10 flex items-center justify-center text-[#1A6B8A] font-black text-lg">
                        {p.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${urgencyDot[urgency]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 truncate">{p.district} · {bn ? 'বয়স' : 'Age'} {p.age}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getRiskBadge(p.risk_score || 0)}`}>
                        {getRiskLabel(p.risk_score || 0)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {days !== null
                          ? (bn ? `${days} দিন আগে` : `${days}d ago`)
                          : (bn ? 'ভিজিট নেই' : 'No visit')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Add patient button */}
          <button
            onClick={() => setShowAddPatient(!showAddPatient)}
            className="w-full py-3.5 border-2 border-dashed border-[#1A6B8A]/30 rounded-2xl text-[#1A6B8A] font-bold text-sm flex items-center justify-center gap-2 active:bg-[#1A6B8A]/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {bn ? 'রোগী যোগ করুন' : 'Add Patient'} ({patientCount}/30)
          </button>

          {showAddPatient && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">{bn ? 'রোগী যোগ করুন' : 'Add to Roster'}</h3>
                <span className="text-xs text-slate-400">{unassigned.length} {bn ? 'জন উপলব্ধ' : 'available'}</span>
              </div>
              <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                {unassigned.length === 0 ? (
                  <p className="text-center py-8 text-sm text-slate-400">{bn ? 'কোনো রোগী নেই' : 'No patients available'}</p>
                ) : unassigned.slice(0, 20).map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold flex-shrink-0">
                      {p.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.district} · Stage {p.ckd_stage || '--'}</p>
                    </div>
                    <button
                      onClick={() => assignPatient(p.id)}
                      disabled={patientCount >= 30}
                      className="px-3 py-1.5 bg-[#1A6B8A] text-white rounded-xl text-xs font-bold disabled:opacity-40 active:bg-[#14556e] transition-colors"
                    >
                      {bn ? 'যোগ' : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VITALS / LOG VISIT TAB ────────────────────────────────────────── */}
      {tab === 'chw-vitals' && (
        <form onSubmit={submitVisit} className="px-4 pt-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-[#1A6B8A]/5 border-b border-slate-100">
              <h2 className="font-bold text-[#1A6B8A] flex items-center gap-2">
                <Activity className="w-4 h-4" />
                {bn ? 'বাড়ি ভিজিট লগ করুন' : 'Log Home Visit'}
              </h2>
            </div>

            <div className="p-4 space-y-4">
              {/* Patient select */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {bn ? 'রোগী *' : 'Patient *'}
                </label>
                <select
                  value={selectedPatient?.id || ''}
                  onChange={e => setSelectedPatient(patients.find(p => p.id === parseInt(e.target.value)) || null)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
                  required
                >
                  <option value="">{bn ? '— রোগী বেছে নিন —' : '— Select patient —'}</option>
                  {sortedPatients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.district}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visit type */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {bn ? 'পরিদর্শনের ধরন' : 'Visit Type'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: 'routine', en: 'Routine', bn: 'নিয়মিত' },
                    { v: 'urgent', en: 'Urgent', bn: 'জরুরি' },
                    { v: 'medication', en: 'Medication Check', bn: 'ওষুধ পরীক্ষা' },
                    { v: 'followup', en: 'Follow-up', bn: 'ফলো-আপ' },
                  ].map(t => (
                    <button
                      key={t.v}
                      type="button"
                      onClick={() => setVisitType(t.v)}
                      className={`py-3 rounded-2xl text-sm font-bold border-2 transition-all active:scale-95 ${visitType === t.v ? 'border-[#1A6B8A] bg-[#1A6B8A] text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                    >
                      {bn ? t.bn : t.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* GPS */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5" />
                  {bn ? 'জিপিএস অবস্থান' : 'GPS Location'}
                </label>
                <button
                  type="button"
                  onClick={getGPS}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all active:scale-95"
                  style={gpsState === 'got' ? { borderColor: '#2ECC71', background: '#EAFAF1', color: '#1a7a44' } : gpsState === 'error' ? { borderColor: '#E74C3C', background: '#FDECEA', color: '#7b1a1a' } : { borderColor: '#e2e8f0', background: '#f8fafc', color: '#64748b' }}
                >
                  {gpsState === 'getting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  {gpsState === 'idle' && (bn ? 'অবস্থান নিন (স্বয়ংক্রিয়)' : 'Get Location (auto)')}
                  {gpsState === 'getting' && (bn ? 'অবস্থান খোঁজা হচ্ছে...' : 'Getting location...')}
                  {gpsState === 'got' && `✓ ${parseFloat(gpsCoords!.lat).toFixed(4)}, ${parseFloat(gpsCoords!.lng).toFixed(4)}`}
                  {gpsState === 'error' && (bn ? 'অবস্থান পাওয়া যায়নি' : 'Location unavailable')}
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {bn ? 'পরিদর্শনের নোট' : 'Visit Notes'}
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
                  placeholder={bn ? 'পরিদর্শনের বিবরণ লিখুন...' : 'Describe the visit...'}
                />
              </div>

              {/* Vitals toggle */}
              <button
                type="button"
                onClick={() => setShowVitals(!showVitals)}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all ${showVitals ? 'border-[#1A6B8A] bg-[#1A6B8A]/5 text-[#1A6B8A]' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
              >
                <Activity className="w-4 h-4" />
                {showVitals ? (bn ? '✓ ভাইটালস যোগ করা হচ্ছে' : '✓ Adding vitals') : (bn ? 'ভাইটালস পরিমাপ করুন (ঐচ্ছিক)' : 'Measure vitals (optional)')}
              </button>

              {showVitals && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  {/* BP row */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-red-500" />
                        {bn ? 'সিস্টোলিক' : 'Systolic BP'}
                      </label>
                      <input type="number" inputMode="numeric" placeholder="120" value={vitals.systolic}
                        onChange={e => setVitals({ ...vitals, systolic: e.target.value })}
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">{bn ? 'ডায়াস্টোলিক' : 'Diastolic BP'}</label>
                      <input type="number" inputMode="numeric" placeholder="80" value={vitals.diastolic}
                        onChange={e => setVitals({ ...vitals, diastolic: e.target.value })}
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30" />
                    </div>
                  </div>
                  {/* Other vitals */}
                  {[
                    { key: 'blood_sugar', icon: <Droplets className="w-3 h-3" style={{ color: '#F39C12' }} />, en: 'Blood Sugar (mmol/L)', bn: 'রক্তের শর্করা (mmol/L)', ph: '5.6' },
                    { key: 'creatinine', icon: <Activity className="w-3 h-3 text-[#1A6B8A]" />, en: 'Creatinine (mg/dL)', bn: 'ক্রিয়েটিনিন (mg/dL)', ph: '1.1' },
                    { key: 'weight', icon: <UserCircle className="w-3 h-3 text-slate-500" />, en: 'Weight (kg)', bn: 'ওজন (কেজি)', ph: '65' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                        {f.icon} {bn ? f.bn : f.en}
                      </label>
                      <input type="number" inputMode="decimal" placeholder={f.ph} step="0.1"
                        value={(vitals as any)[f.key]}
                        onChange={e => setVitals({ ...vitals, [f.key]: e.target.value })}
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30" />
                    </div>
                  ))}
                  {/* Urine protein */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">{bn ? 'প্রস্রাবে প্রোটিন' : 'Urine Protein'}</label>
                    <select value={vitals.urine_protein} onChange={e => setVitals({ ...vitals, urine_protein: e.target.value })}
                      className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none">
                      {['Negative', 'Trace', '1+', '2+', '3+', '4+'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  {/* Fatigue */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      {bn ? `ক্লান্তি: ${vitals.fatigue}/10` : `Fatigue: ${vitals.fatigue}/10`}
                    </label>
                    <input type="range" min="1" max="10" value={vitals.fatigue}
                      onChange={e => setVitals({ ...vitals, fatigue: parseInt(e.target.value) })}
                      className="w-full accent-[#1A6B8A]" />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>{bn ? 'স্বাভাবিক' : 'Normal'}</span>
                      <span>{bn ? 'অত্যন্ত ক্লান্ত' : 'Very tired'}</span>
                    </div>
                  </div>
                  {/* Edema */}
                  <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer active:bg-slate-50">
                    <input type="checkbox" checked={vitals.edema} onChange={e => setVitals({ ...vitals, edema: e.target.checked })}
                      className="w-5 h-5 accent-[#1A6B8A] flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-700">{bn ? 'পা ফোলা (এডিমা) আছে' : 'Edema / Swelling present'}</span>
                  </label>
                </div>
              )}

              {/* Validation errors */}
              {validErrors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl space-y-1">
                  {validErrors.map((err, i) => (
                    <p key={i} className="text-sm text-red-700 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {err}
                    </p>
                  ))}
                </div>
              )}

              {/* Offline indicator */}
              {!isOnline && (
                <div className="flex items-center gap-2 p-3 rounded-2xl text-sm" style={{ background: '#FEF5E7', border: '1px solid #F39C12', color: '#7d5100' }}>
                  <WifiOff className="w-4 h-4 flex-shrink-0" />
                  {bn ? 'অফলাইনে সংরক্ষিত হবে — পরে সিঙ্ক হবে' : 'Will save offline — syncs when connected'}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedPatient}
            className="w-full py-4 bg-[#1A6B8A] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:bg-[#14556e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {!isOnline ? (bn ? 'অফলাইনে সংরক্ষণ করুন' : 'Save Offline') : (bn ? 'ভিজিট জমা দিন' : 'Submit Visit')}
          </button>
        </form>
      )}

      {/* ── POINTS TAB ───────────────────────────────────────────────────── */}
      {tab === 'chw-points' && (
        <div className="px-4 pt-4 space-y-4">
          {/* Points hero */}
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 text-white shadow-lg shadow-amber-200">
            <div className="flex items-center gap-2 mb-1 opacity-80">
              <Star className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-wide">{bn ? 'মোট পয়েন্ট' : 'Total Points'}</span>
            </div>
            <p className="text-5xl font-black mb-3">{profile?.points || 0}</p>
            <div className="bg-white/20 rounded-full h-2.5 mb-2">
              <div className="bg-white rounded-full h-2.5 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm opacity-80">
              {bn ? `পরবর্তী মাইলস্টোন: ${nextMilestone} পয়েন্ট` : `Next milestone: ${nextMilestone} pts`}
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-3 border border-slate-100 text-center">
              <p className="text-2xl font-black text-[#1A6B8A]">{visitCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">{bn ? 'ভিজিট' : 'Visits'}</p>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-slate-100 text-center">
              <p className="text-2xl font-black text-slate-800">{profile?.streak_days || 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">{bn ? 'স্ট্রিক' : 'Streak'}</p>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-slate-100 text-center">
              <p className="text-2xl font-black" style={{ color: '#2ECC71' }}>{earnedBadges.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">{bn ? 'ব্যাজ' : 'Badges'}</p>
            </div>
          </div>

          {/* Badges */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-4 h-4" style={{ color: '#F39C12' }} />
                {bn ? 'ব্যাজ ও পুরস্কার' : 'Badges & Rewards'}
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-3 p-4">
              {BADGES.map(badge => {
                const earned = badge.check(profile, visitCount, patientCount);
                return (
                  <div key={badge.id} className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${earned ? '' : 'bg-slate-50 opacity-40'}`} style={earned ? { background: '#FEF5E7' } : {}}>
                    <span className="text-2xl">{badge.icon}</span>
                    <span className="text-[10px] font-bold text-center text-slate-600 leading-tight">{bn ? badge.bn : badge.en}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1A6B8A]" />
                {bn ? 'জেলা লিডারবোর্ড' : 'District Leaderboard'}
              </h3>
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-400">{bn ? 'ডেটা নেই' : 'No data yet'}</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {leaderboard.slice(0, 10).map((l, i) => {
                  const isMe = l.name === user?.name;
                  return (
                    <div key={i} className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-[#1A6B8A]/5' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${i === 1 ? 'bg-slate-300 text-slate-700' : i >= 3 ? 'bg-slate-100 text-slate-500' : ''}`} style={i === 0 ? { background: '#F39C12', color: '#fff' } : i === 2 ? { background: '#E74C3C', color: '#fff' } : {}}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isMe ? 'text-[#1A6B8A]' : 'text-slate-800'}`}>{l.name} {isMe && '(আপনি)'}</p>
                        <p className="text-xs text-slate-400">{l.district} · {l.visit_count} {bn ? 'ভিজিট' : 'visits'}</p>
                      </div>
                      <p className="font-black text-sm" style={{ color: '#F39C12' }}>{l.points} {bn ? 'pts' : 'pts'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ─────────────────────────────────────────────────── */}
      {tab === 'chw-settings' && (
        <div className="px-4 pt-4 space-y-4">
          {/* Profile card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#1A6B8A] flex items-center justify-center text-white font-black text-2xl flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-lg">{user?.name}</p>
              <p className="text-sm text-slate-500">{profile?.region || user?.email}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 bg-[#1A6B8A]/10 text-[#1A6B8A] text-xs font-bold rounded-full uppercase">CHW</span>
            </div>
          </div>

          {/* Language */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#1A6B8A]" />
                {bn ? 'ভাষা' : 'Language'}
              </h3>
            </div>
            <div className="flex gap-3 p-4">
              <button
                onClick={() => setLanguage('bn')}
                className={`flex-1 py-3 rounded-2xl font-bold border-2 transition-all ${language === 'bn' ? 'border-[#1A6B8A] bg-[#1A6B8A] text-white' : 'border-slate-200 text-slate-600'}`}
              >
                বাংলা
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 py-3 rounded-2xl font-bold border-2 transition-all ${language === 'en' ? 'border-[#1A6B8A] bg-[#1A6B8A] text-white' : 'border-slate-200 text-slate-600'}`}
              >
                English
              </button>
            </div>
          </div>

          {/* Sync status */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                {isOnline ? <Wifi className="w-4 h-4" style={{ color: '#2ECC71' }} /> : <WifiOff className="w-4 h-4" style={{ color: '#F39C12' }} />}
                {bn ? 'সিঙ্ক স্ট্যাটাস' : 'Sync Status'}
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{bn ? 'সংযোগ' : 'Connection'}</span>
                <span className="text-sm font-bold" style={{ color: isOnline ? '#2ECC71' : '#F39C12' }}>
                  {isOnline ? (bn ? 'অনলাইন' : 'Online') : (bn ? 'অফলাইন' : 'Offline')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{bn ? 'পেন্ডিং ভিজিট' : 'Pending visits'}</span>
                <span className="text-sm font-bold" style={{ color: pendingCount > 0 ? '#F39C12' : '#2ECC71' }}>{pendingCount}</span>
              </div>
              {isOnline && pendingCount > 0 && (
                <button
                  onClick={syncPending}
                  disabled={isSyncing}
                  className="w-full py-3 bg-[#1A6B8A] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:bg-[#14556e] transition-colors disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {bn ? 'এখনই সিঙ্ক করুন' : 'Sync Now'}
                </button>
              )}
              {syncMsg && <p className="text-sm font-semibold text-center" style={{ color: '#2ECC71' }}>{syncMsg}</p>}
            </div>
          </div>

          {/* Stats summary */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
            <h3 className="font-bold text-slate-800 mb-3">{bn ? 'আমার পরিসংখ্যান' : 'My Stats'}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: bn ? 'মোট পয়েন্ট' : 'Total Points', value: profile?.points || 0, color: 'text-[#F39C12]' },
                { label: bn ? 'মোট ভিজিট' : 'Total Visits', value: visitCount, color: 'text-[#1A6B8A]' },
                { label: bn ? 'রোগীর সংখ্যা' : 'Patients', value: `${patientCount}/30`, color: 'text-slate-800' },
                { label: bn ? 'ব্যাজ অর্জিত' : 'Badges Earned', value: earnedBadges.length, color: 'text-[#2ECC71]' },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-2xl p-3 text-center">
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-full py-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-2 active:bg-red-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {bn ? 'লগআউট করুন' : 'Log Out'}
          </button>
        </div>
      )}

      {/* ── SCHEDULE TAB ─────────────────────────────────────────────────── */}
      {tab === 'chw-schedule' && (
        <div className="px-4 pt-4 pb-8 space-y-4">

          {/* Success / error feedback */}
          {schedMsg && (
            <div className="p-3 rounded-2xl text-sm font-semibold flex items-center gap-2"
              style={{ background: schedMsg.startsWith('✓') ? '#EAFAF1' : '#FDECEA', border: `1px solid ${schedMsg.startsWith('✓') ? '#2ECC71' : '#E74C3C'}`, color: schedMsg.startsWith('✓') ? '#1a7a44' : '#7b1a1a' }}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {schedMsg}
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">{bn ? 'সময়সূচী' : 'Visit Schedule'}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {scheduledVisits.filter(v => v.status === 'pending').length} {bn ? 'টি আসন্ন ভিজিট' : 'upcoming visits'}
              </p>
            </div>
            <button
              onClick={() => { setShowScheduleModal(true); setSchedMsg(''); }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold text-white shadow-sm active:opacity-80 transition-opacity"
              style={{ background: '#1A6B8A' }}
            >
              <CalendarPlus className="w-4 h-4" />
              {bn ? 'নতুন' : 'New'}
            </button>
          </div>

          {/* Quick suggest: auto-recommend next visits by risk */}
          {patients.length > 0 && (() => {
            const suggested = patients
              .filter(p => {
                const pending = scheduledVisits.filter(s => s.patient_id === p.id && s.status === 'pending');
                return pending.length === 0; // no scheduled visit yet
              })
              .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
              .slice(0, 3);
            if (suggested.length === 0) return null;
            const suggestDate = (riskScore: number) => {
              const days = riskScore > 75 ? 7 : riskScore > 50 ? 14 : 30;
              const d = new Date();
              d.setDate(d.getDate() + days);
              return d.toISOString().slice(0, 10);
            };
            return (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#1A6B8A', background: '#F0F8FB' }}>
                <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#1A6B8A' }}>
                  <CalendarDays className="w-4 h-4 text-white" />
                  <p className="text-xs font-black text-white">{bn ? 'পরামর্শ: এখনো শিডিউল নেই' : 'Suggested: no visit scheduled yet'}</p>
                </div>
                <div className="p-3 space-y-2">
                  {suggested.map(p => {
                    const nextDate = suggestDate(p.risk_score || 0);
                    const days = p.risk_score > 75 ? 7 : p.risk_score > 50 ? 14 : 30;
                    return (
                      <div key={p.id} className="bg-white rounded-xl p-3 flex items-center gap-3 border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-[#1A6B8A]/10 flex items-center justify-center text-[#1A6B8A] font-black text-sm flex-shrink-0">
                          {p.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500">{bn ? `${days} দিনের মধ্যে` : `Within ${days} days`} · {nextDate}</p>
                        </div>
                        <button
                          onClick={async () => {
                            await fetch('/api/chw/schedule-visit', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ patient_id: p.id, scheduled_date: nextDate, visit_type: 'routine', reason: bn ? 'ঝুঁকি অনুযায়ী নির্ধারিত' : 'Risk-based follow-up' }),
                            });
                            fetchData();
                            setSchedMsg(bn ? `✓ ${p.name}-এর জন্য ভিজিট শিডিউল হয়েছে` : `✓ Scheduled for ${p.name}`);
                            setTimeout(() => setSchedMsg(''), 4000);
                          }}
                          className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                          style={{ background: '#2ECC71' }}
                        >
                          {bn ? 'যোগ করুন' : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Scheduled visits list */}
          {scheduledVisits.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
              <CalendarDays className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">{bn ? 'কোনো শিডিউল নেই' : 'No visits scheduled'}</p>
              <p className="text-xs text-slate-400 mt-1">{bn ? 'উপরের বোতামে ক্লিক করুন' : 'Tap "New" to schedule one'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Group by status */}
              {['pending', 'completed'].map(status => {
                const group = scheduledVisits.filter(v => v.status === status);
                if (group.length === 0) return null;
                const today = new Date().toISOString().slice(0, 10);
                return (
                  <div key={status}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1"
                      style={{ color: status === 'pending' ? '#1A6B8A' : '#2ECC71' }}>
                      {status === 'pending' ? (bn ? 'আসন্ন' : 'Upcoming') : (bn ? 'সম্পন্ন' : 'Completed')}
                    </p>
                    <div className="space-y-2">
                      {group.map(sv => {
                        const isToday = sv.scheduled_date === today;
                        const isPast = sv.scheduled_date < today && status === 'pending';
                        const riskColor = sv.risk_score > 75 ? '#E74C3C' : sv.risk_score > 50 ? '#F39C12' : '#2ECC71';

                        return (
                          <div key={sv.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            {/* Date stripe */}
                            <div className="flex items-center gap-2 px-4 py-2"
                              style={{
                                background: isToday ? '#1A6B8A' : isPast ? '#FDECEA' : status === 'completed' ? '#EAFAF1' : '#F8FAFC',
                                borderBottom: '1px solid',
                                borderColor: isToday ? '#1A6B8A' : isPast ? '#E74C3C' : status === 'completed' ? '#2ECC71' : '#e2e8f0',
                              }}>
                              <CalendarDays className="w-3.5 h-3.5 flex-shrink-0"
                                style={{ color: isToday ? '#fff' : isPast ? '#E74C3C' : status === 'completed' ? '#2ECC71' : '#64748b' }} />
                              <span className="text-xs font-bold"
                                style={{ color: isToday ? '#fff' : isPast ? '#E74C3C' : status === 'completed' ? '#1a7a44' : '#64748b' }}>
                                {isToday ? (bn ? 'আজ — ' : 'Today — ') : isPast ? (bn ? 'মেয়াদ পেরিয়েছে — ' : 'Overdue — ') : ''}{sv.scheduled_date}
                              </span>
                              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/30"
                                style={{ color: isToday ? '#fff' : '#64748b' }}>
                                {sv.visit_type}
                              </span>
                            </div>

                            {/* Patient info */}
                            <div className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                                  style={{ background: riskColor }}>
                                  {sv.patient_name?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-slate-900 truncate">{sv.patient_name}</p>
                                  <p className="text-xs text-slate-500">{sv.district} {sv.ckd_stage ? `· Stage ${sv.ckd_stage}` : ''}</p>
                                  {sv.reason && <p className="text-xs text-slate-400 mt-0.5 italic truncate">{sv.reason}</p>}
                                  {sv.notes && status === 'completed' && (
                                    <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded-lg px-2 py-1">📝 {sv.notes}</p>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              {status === 'pending' && (
                                <div className="flex gap-2 mt-3">
                                  {/* Complete */}
                                  {completingId === sv.id ? (
                                    <div className="flex-1 space-y-2">
                                      <textarea
                                        value={completeNotes}
                                        onChange={e => setCompleteNotes(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 resize-none"
                                        placeholder={bn ? 'সংক্ষিপ্ত নোট (ঐচ্ছিক)...' : 'Brief notes (optional)...'}
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={async () => {
                                            await fetch(`/api/chw/schedule-visit/${sv.id}/complete`, {
                                              method: 'PUT',
                                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                              body: JSON.stringify({ notes: completeNotes }),
                                            });
                                            setCompletingId(null); setCompleteNotes('');
                                            fetchData();
                                            setSchedMsg(bn ? '✓ ভিজিট সম্পন্ন হিসেবে চিহ্নিত' : '✓ Visit marked complete');
                                            setTimeout(() => setSchedMsg(''), 4000);
                                          }}
                                          className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                                          style={{ background: '#2ECC71' }}>
                                          {bn ? 'সম্পন্ন ✓' : 'Confirm ✓'}
                                        </button>
                                        <button onClick={() => setCompletingId(null)}
                                          className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100">
                                          {bn ? 'বাতিল' : 'Cancel'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : summaryId === sv.id ? (
                                    <div className="flex-1 space-y-2">
                                      <textarea
                                        value={summaryText}
                                        onChange={e => setSummaryText(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30 resize-none"
                                        placeholder={bn ? 'ডাক্তারের জন্য সারসংক্ষেপ লিখুন...' : 'Write visit summary for doctor...'}
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          disabled={summarySubmitting || !summaryText.trim()}
                                          onClick={async () => {
                                            setSummarySubmitting(true);
                                            await fetch('/api/chw/send-visit-summary', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                              body: JSON.stringify({ scheduled_visit_id: sv.id, patient_id: sv.patient_id, summary_text: summaryText }),
                                            });
                                            setSummarySubmitting(false); setSummaryId(null); setSummaryText('');
                                            fetchData();
                                            setSchedMsg(bn ? '✓ সারসংক্ষেপ ডাক্তারকে পাঠানো হয়েছে' : '✓ Summary sent to doctor');
                                            setTimeout(() => setSchedMsg(''), 5000);
                                          }}
                                          className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-50"
                                          style={{ background: '#1A6B8A' }}>
                                          {summarySubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                          {bn ? 'পাঠান' : 'Send'}
                                        </button>
                                        <button onClick={() => { setSummaryId(null); setSummaryText(''); }}
                                          className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100">
                                          {bn ? 'বাতিল' : 'Cancel'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => { setCompletingId(sv.id); setSummaryId(null); }}
                                        className="flex-1 py-2 rounded-xl text-xs font-bold border-2 flex items-center justify-center gap-1"
                                        style={{ borderColor: '#2ECC71', color: '#2ECC71', background: '#EAFAF1' }}>
                                        <CheckSquare className="w-3.5 h-3.5" />
                                        {bn ? 'সম্পন্ন' : 'Done'}
                                      </button>
                                      {sv.assigned_doctor_id && !sv.doctor_notified && (
                                        <button
                                          onClick={() => { setSummaryId(sv.id); setCompletingId(null); }}
                                          className="flex-1 py-2 rounded-xl text-xs font-bold border-2 flex items-center justify-center gap-1"
                                          style={{ borderColor: '#1A6B8A', color: '#1A6B8A', background: '#F0F8FB' }}>
                                          <Send className="w-3.5 h-3.5" />
                                          {bn ? 'ডাক্তারকে জানান' : 'Notify Doctor'}
                                        </button>
                                      )}
                                      {sv.doctor_notified === 1 && (
                                        <span className="flex-1 py-2 rounded-xl text-xs font-bold text-center"
                                          style={{ background: '#EAFAF1', color: '#1a7a44' }}>
                                          ✓ {bn ? 'ডাক্তার জানেন' : 'Doctor notified'}
                                        </span>
                                      )}
                                      <button
                                        onClick={async () => {
                                          await fetch(`/api/chw/schedule-visit/${sv.id}`, {
                                            method: 'DELETE',
                                            headers: { Authorization: `Bearer ${token}` },
                                          });
                                          fetchData();
                                        }}
                                        className="p-2 rounded-xl text-slate-400 hover:text-red-500 transition-colors bg-slate-100">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SCHEDULE VISIT MODAL ─────────────────────────────────────────── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowScheduleModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-[#1A6B8A]" />
                <h3 className="font-black text-slate-900">{bn ? 'নতুন ভিজিট শিডিউল' : 'Schedule a Visit'}</h3>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Patient */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">{bn ? 'রোগী *' : 'Patient *'}</label>
              <select
                value={schedPatient}
                onChange={e => setSchedPatient(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
                required
              >
                <option value="">{bn ? '— রোগী বেছে নিন —' : '— Select patient —'}</option>
                {sortedPatients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} · {p.district}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">{bn ? 'পরিদর্শনের তারিখ *' : 'Visit Date *'}</label>
              <input
                type="date"
                value={schedDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setSchedDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
                required
              />
            </div>

            {/* Visit type */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">{bn ? 'ভিজিটের ধরন' : 'Visit Type'}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 'routine', en: 'Routine', bn: 'নিয়মিত' },
                  { v: 'urgent', en: 'Urgent', bn: 'জরুরি' },
                  { v: 'medication', en: 'Medication', bn: 'ওষুধ' },
                  { v: 'followup', en: 'Follow-up', bn: 'ফলো-আপ' },
                ].map(t => (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setSchedType(t.v)}
                    className={`py-2.5 rounded-2xl text-sm font-bold border-2 transition-all ${schedType === t.v ? 'border-[#1A6B8A] bg-[#1A6B8A] text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    {bn ? t.bn : t.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">{bn ? 'কারণ (ঐচ্ছিক)' : 'Reason (optional)'}</label>
              <input
                type="text"
                value={schedReason}
                onChange={e => setSchedReason(e.target.value)}
                placeholder={bn ? 'যেমন: BP চেক, ওষুধ দেওয়া...' : 'e.g. BP check, medication delivery...'}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
              />
            </div>

            {/* Submit */}
            <button
              disabled={!schedPatient || !schedDate || schedSubmitting}
              onClick={async () => {
                if (!schedPatient || !schedDate) return;
                setSchedSubmitting(true);
                const r = await fetch('/api/chw/schedule-visit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ patient_id: parseInt(schedPatient), scheduled_date: schedDate, visit_type: schedType, reason: schedReason }),
                });
                setSchedSubmitting(false);
                if (r.ok) {
                  setShowScheduleModal(false);
                  setSchedPatient(''); setSchedDate(''); setSchedType('routine'); setSchedReason('');
                  fetchData();
                  setSchedMsg(bn ? '✓ ভিজিট সফলভাবে শিডিউল হয়েছে' : '✓ Visit scheduled successfully');
                  setTimeout(() => setSchedMsg(''), 5000);
                }
              }}
              className="w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              style={{ background: '#1A6B8A' }}
            >
              {schedSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
              {bn ? 'শিডিউল করুন' : 'Schedule Visit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
