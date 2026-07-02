import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Activity,
  Loader2, Phone, Users, ChevronRight, Clock, Save, CheckCircle2,
  Link, Share2, MessageCircle, Copy, X, AlertTriangle,
  Maximize2, Minimize2, Settings, MessageSquare, FileText,
  MapPin, Heart, Shield
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface TeleconsultProps {
  patientId?: number;
  patientName?: string;
  onEnd?: () => void;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getRiskColor(score: number) {
  if (score > 75) return { bg: '#FDECEA', color: '#E74C3C', label: 'Critical' };
  if (score > 50) return { bg: '#FEF5E7', color: '#F39C12', label: 'High' };
  if (score > 25) return { bg: '#FEF5E7', color: '#F39C12', label: 'Moderate' };
  return { bg: '#EAFAF1', color: '#2ECC71', label: 'Low' };
}

// ── Patient Picker Screen ────────────────────────────────────────────────────
function PatientPicker({ patients, loading, onSelect, bn }: {
  patients: any[]; loading: boolean;
  onSelect: (p: { id: number; name: string }) => void; bn: boolean;
}) {
  const [search, setSearch] = useState('');
  const filtered = patients.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.district || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F4A63] via-[#1A6B8A] to-[#1e8aad] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-lg"
      >
        {/* Header card */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">{bn ? 'টেলিকনসালটেশন' : 'Teleconsultation'}</h1>
          <p className="text-white/60 text-sm mt-1">{bn ? 'শুরু করতে একজন রোগী নির্বাচন করুন' : 'Select a patient to begin the consultation'}</p>
        </div>

        {/* Patient list card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          {/* Search */}
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={bn ? 'নাম বা জেলা দিয়ে খুঁজুন...' : 'Search by name or district...'}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A] transition-all"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin text-[#1A6B8A]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-semibold text-sm">
                  {search ? (bn ? 'কোনো রোগী পাওয়া যায়নি' : 'No matching patients') : (bn ? 'কোনো রোগী নেই' : 'No patients assigned')}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {filtered.map((p: any) => {
                  const risk = getRiskColor(p.risk_score || 0);
                  const initials = p.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
                  return (
                    <li key={p.id}>
                      <button onClick={() => onSelect({ id: p.id, name: p.name })}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left group">
                        <div className="w-11 h-11 rounded-xl text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${risk.color}dd, ${risk.color}88)` }}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate group-hover:text-[#1A6B8A] transition-colors">{p.name}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                            {p.district && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.district}</span>}
                            {p.age && <span>{p.age}y</span>}
                            {p.ckd_stage && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">G{p.ckd_stage}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                            style={{ background: risk.bg, color: risk.color, borderColor: risk.color + '40' }}>
                            {risk.label}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#1A6B8A] transition-colors" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-white/40 text-xs text-center mt-4 font-medium">
          {bn ? 'WebRTC দিয়ে এন্ড-টু-এন্ড এনক্রিপ্টেড · কোনো অ্যাপ প্রয়োজন নেই' : 'End-to-end encrypted via WebRTC · No app required for patients'}
        </p>
      </motion.div>
    </div>
  );
}

// ── Share Panel Component ────────────────────────────────────────────────────
function SharePanel({ joinUrl, onClose, bn }: { joinUrl: string; onClose: () => void; bn: boolean }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(joinUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareViaWhatsApp = () => {
    const msg = bn
      ? `আপনার ডাক্তার একটি ভিডিও কনসালটেশন শুরু করেছেন। এখানে ক্লিক করুন: ${joinUrl}`
      : `Your doctor has started a KidneyCare BD video consultation. Click to join: ${joinUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareViaSMS = () =>
    window.open(`sms:?body=${encodeURIComponent(`Join KidneyCare BD video call: ${joinUrl}`)}`, '_blank');

  const shareNative = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'KidneyCare BD Video Call', url: joinUrl }).catch(() => {});
    } else {
      copyLink();
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="bg-white border border-[#1A6B8A]/20 rounded-2xl p-4 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1A6B8A]/10 flex items-center justify-center">
            <Link className="w-4 h-4 text-[#1A6B8A]" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">{bn ? 'রোগীকে ইনভাইট পাঠান' : 'Invite Patient to Join'}</p>
            <p className="text-[10px] text-slate-400">{bn ? 'লগইন ছাড়াই যোগ দিতে পারবেন' : 'No login required for patient'}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* URL */}
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
        <span className="text-xs text-slate-600 flex-1 truncate font-mono">{joinUrl}</span>
        <button onClick={copyLink}
          className="shrink-0 flex items-center gap-1 text-xs font-bold transition-colors"
          style={{ color: copied ? '#2ECC71' : '#1A6B8A' }}>
          {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? (bn ? 'কপি!' : 'Copied!') : (bn ? 'কপি' : 'Copy')}
        </button>
      </div>

      {/* Share buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={shareViaWhatsApp}
          className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#25D366' }}>
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </button>
        <button onClick={shareViaSMS}
          className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#1A6B8A' }}>
          <MessageSquare className="w-4 h-4" />
          SMS
        </button>
        <button onClick={shareNative}
          className="flex flex-col items-center gap-1.5 py-2.5 bg-slate-700 hover:bg-slate-800 rounded-xl text-white text-xs font-bold transition-all active:scale-95">
          <Share2 className="w-4 h-4" />
          {bn ? 'শেয়ার' : 'Share'}
        </button>
      </div>

      <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2 border border-emerald-100">
        <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
        <p className="text-xs text-emerald-700 font-medium">
          {bn ? 'সেশনটি এনক্রিপ্টেড এবং শুধুমাত্র এই কলের জন্য বৈধ।' : 'Session is encrypted and valid for this call only.'}
        </p>
      </div>
    </motion.div>
  );
}

// ── Consultation Notes Component ─────────────────────────────────────────────
function ConsultNotes({ notes, setNotes, onSave, saved, bn }: {
  notes: string; setNotes: (v: string) => void;
  onSave: () => void; saved: boolean; bn: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#1A6B8A]" />
          <span className="text-sm font-black text-slate-800">{bn ? 'কনসালটেশন নোট' : 'Consultation Notes'}</span>
        </div>
        <button onClick={onSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${saved
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            : 'bg-[#1A6B8A] text-white hover:bg-[#14556e]'}`}>
          {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? (bn ? 'সংরক্ষিত' : 'Saved!') : (bn ? 'সংরক্ষণ' : 'Save')}
        </button>
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A] transition-all leading-relaxed"
        placeholder={bn ? 'উপসর্গ, পরামর্শ, পরবর্তী পদক্ষেপ লিখুন...' : 'Symptoms, advice, follow-up plan, prescription notes...'} />
    </div>
  );
}

// ── Patient Summary Sidebar ──────────────────────────────────────────────────
function PatientSummary({ patientData, bn }: { patientData: any; bn: boolean }) {
  if (!patientData?.patient) return null;
  const p = patientData.patient;
  const risk = getRiskColor(p.risk_score || 0);
  const initials = (p.name || '?').split(' ').slice(0, 2).map((n: string) => n[0].toUpperCase()).join('');
  const latestGfr = patientData.gfr?.length > 0
    ? Math.round(patientData.gfr[patientData.gfr.length - 1]?.ckd_epi || 0) : null;
  const latestVitals = patientData.vitals?.[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Patient identity header */}
      <div className="p-4 border-b border-slate-50"
        style={{ background: 'linear-gradient(135deg,#1A6B8A08,#1A6B8A04)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl text-white flex items-center justify-center font-black text-base shadow-sm"
            style={{ background: `linear-gradient(135deg,${risk.color}dd,${risk.color}77)` }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-sm truncate">{p.name}</p>
            <p className="text-xs text-slate-400">
              {p.age ? `${p.age}y` : ''}{p.sex ? ` · ${p.sex}` : ''}{p.district ? ` · ${p.district}` : ''}
            </p>
          </div>
        </div>

        {/* Condition tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {p.diabetes === 1 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Diabetes</span>}
          {p.hypertension === 1 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">Hypertension</span>}
          {p.arsenic_prone_area === 1 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">Arsenic Risk</span>}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Key stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center bg-slate-50 rounded-xl p-2.5 border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">eGFR</p>
            <p className="text-lg font-black text-slate-800">{latestGfr ?? '—'}</p>
          </div>
          <div className="text-center rounded-xl p-2.5 border" style={{ background: risk.bg, borderColor: risk.color + '40' }}>
            <p className="text-[9px] font-black uppercase tracking-wide" style={{ color: risk.color }}>Risk</p>
            <p className="text-sm font-black" style={{ color: risk.color }}>{risk.label}</p>
          </div>
          <div className="text-center bg-[#EFF8FB] rounded-xl p-2.5 border border-[#1A6B8A]/15">
            <p className="text-[9px] font-black text-[#1A6B8A] uppercase tracking-wide">Stage</p>
            <p className="text-lg font-black text-[#1A6B8A]">G{p.ckd_stage || '—'}</p>
          </div>
        </div>

        {/* Latest vitals */}
        {latestVitals && (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{bn ? 'সর্বশেষ ভাইটালস' : 'Latest Vitals'}</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {latestVitals.systolic && (
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3 h-3 text-red-500 shrink-0" />
                  <span className="font-bold text-slate-700">{latestVitals.systolic}/{latestVitals.diastolic}</span>
                  <span className="text-slate-400">mmHg</span>
                </div>
              )}
              {latestVitals.creatinine && (
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-purple-500 shrink-0" />
                  <span className="font-bold text-slate-700">{latestVitals.creatinine}</span>
                  <span className="text-slate-400">mg/dL</span>
                </div>
              )}
              {latestVitals.blood_sugar && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="w-3 h-3 text-amber-500 shrink-0 font-black text-[10px]">BG</span>
                  <span className="font-bold text-slate-700">{latestVitals.blood_sugar}</span>
                  <span className="text-slate-400">mmol/L</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GFR trend mini chart */}
        {patientData.gfr?.length > 1 && (
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{bn ? 'জিএফআর ট্রেন্ড' : 'GFR Trend'}</p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...patientData.gfr].reverse().slice(-8)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" hide />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} width={28} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 11 }} />
                  <Line type="monotone" dataKey="ckd_epi" stroke="#1A6B8A" strokeWidth={2.5}
                    dot={{ r: 3, fill: '#1A6B8A', strokeWidth: 0 }} name="eGFR" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Action links */}
        <div className="space-y-1.5 pt-1 border-t border-slate-50">
          <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', {
            detail: { page: `patient-${p.id}`, selectedPatient: { id: p.id, name: p.name } }
          }))}
            className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-[#1A6B8A] hover:bg-[#1A6B8A]/5 transition-all">
            <Activity className="w-3.5 h-3.5" />
            {bn ? 'সম্পূর্ণ প্রোফাইল দেখুন' : 'View Full Clinical Profile'}
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', {
            detail: { page: 'prescriptions', selectedPatient: { id: p.id, name: p.name } }
          }))}
            className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-[#1A6B8A] hover:bg-[#1A6B8A]/5 transition-all">
            <FileText className="w-3.5 h-3.5" />
            {bn ? 'প্রেসক্রিপশন লিখুন' : 'Issue Prescription'}
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────────────────
export default function Teleconsult({ patientId, patientName, onEnd }: TeleconsultProps) {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [consultId, setConsultId]             = useState<number | null>(null);
  const [joinToken, setJoinToken]             = useState<string | null>(null);
  const [roomId, setRoomId]                   = useState<string | null>(null);
  const [isCallActive, setIsCallActive]       = useState(false);
  const [isVideoOn, setIsVideoOn]             = useState(true);
  const [isMuted, setIsMuted]                 = useState(false);
  const [isConnecting, setIsConnecting]       = useState(false);
  const [patientData, setPatientData]         = useState<any>(null);
  const [history, setHistory]                 = useState<any[]>([]);
  const [notes, setNotes]                     = useState('');
  const [notesSaved, setNotesSaved]           = useState(false);
  const [callDuration, setCallDuration]       = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'connecting'|'good'|'fair'|'poor'>('connecting');
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: number; name: string } | null>(
    patientId ? { id: patientId, name: patientName || '' } : null
  );
  const [patients, setPatients]             = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [mediaError, setMediaError]           = useState('');
  const [showSharePanel, setShowSharePanel]   = useState(false);
  const [isFullscreen, setIsFullscreen]       = useState(false);
  const [activeTab, setActiveTab]             = useState<'notes'|'history'>('notes');

  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const consultIdRef   = useRef<number | null>(null);
  const joinTokenRef   = useRef<string | null>(null);
  const roomIdRef      = useRef<string | null>(null);
  const lastSigRef     = useRef(0);
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { consultIdRef.current = consultId; }, [consultId]);
  useEffect(() => { joinTokenRef.current = joinToken; }, [joinToken]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  useEffect(() => {
    fetchHistory();
    if (patientId) fetchPatientData(patientId);
    if (!patientId && user?.role === 'doctor') fetchPatients();
    return () => { cleanupCall(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  useEffect(() => {
    if (selectedPatient?.id) fetchPatientData(selectedPatient.id);
  }, [selectedPatient?.id]);

  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isCallActive]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/teleconsult/history', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setHistory(await res.json());
    } catch (_) {}
  };

  const fetchPatientData = async (id: number) => {
    if (!id || user?.role !== 'doctor') return;
    try {
      const res = await fetch(`/api/doctor/patient/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPatientData(await res.json());
    } catch (_) {}
  };

  const fetchPatients = async () => {
    setLoadingPatients(true);
    try {
      const res = await fetch('/api/doctor/patients', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setPatients(Array.isArray(d) ? d : []); }
    } catch (_) {}
    setLoadingPatients(false);
  };

  const cleanupCall = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    streamRef.current = null;
    pcRef.current = null;
  }, []);

  const postSignal = useCallback(async (rId: string, jToken: string, type: string, payload: any) => {
    try {
      await fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomToken: jToken, type, sender: 'doctor', payload: JSON.stringify(payload) }),
      });
    } catch (_) {}
  }, []);

  const startPolling = useCallback((rId: string, jToken: string, pc: RTCPeerConnection) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/signals/${rId}?after=${lastSigRef.current}&token=${jToken}`);
        if (!res.ok) return;
        const sigs: any[] = await res.json();
        for (const sig of sigs) {
          if (sig.id > lastSigRef.current) lastSigRef.current = sig.id;
          if (sig.sender === 'doctor') continue;
          const payload = JSON.parse(sig.payload);
          if (sig.type === 'answer' && pc.signalingState !== 'stable') {
            try { await pc.setRemoteDescription(new RTCSessionDescription(payload)); } catch (_) {}
          } else if (sig.type === 'ice-patient') {
            try { await pc.addIceCandidate(new RTCIceCandidate(payload)); } catch (_) {}
          }
        }
      } catch (_) {}
    }, 1000);
  }, []);

  const startCall = async () => {
    setIsConnecting(true);
    setMediaError('');
    let stream: MediaStream | null = null;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setIsVideoOn(false);
      }
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      let jToken: string | null = null, rId: string | null = null, cId: number | null = null;
      const res = await fetch('/api/teleconsult/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patient_id: selectedPatient?.id || null }),
      });
      if (res.ok) {
        const data = await res.json();
        cId = data.id; jToken = data.joinToken; rId = data.roomId;
        setConsultId(cId); setJoinToken(jToken); setRoomId(rId);
        consultIdRef.current = cId; joinTokenRef.current = jToken; roomIdRef.current = rId;
      }

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] });
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream!));

      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0];
          setRemoteConnected(true);
        }
      };

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        if (s === 'connected' || s === 'completed') { setConnectionQuality('good'); setRemoteConnected(true); }
        else if (s === 'checking') setConnectionQuality('fair');
        else if (s === 'failed' || s === 'disconnected') { setConnectionQuality('poor'); setRemoteConnected(false); }
        else if (s === 'closed') { setConnectionQuality('connecting'); setRemoteConnected(false); }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && rId && jToken) postSignal(rId, jToken, 'ice-doctor', e.candidate.toJSON());
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (rId && jToken) { await postSignal(rId, jToken, 'offer', offer); startPolling(rId, jToken, pc); }

      setIsCallActive(true);
      setShowSharePanel(true);
    } catch (err: any) {
      setMediaError(err?.name === 'NotAllowedError'
        ? (bn ? 'ক্যামেরা/মাইক্রোফোন অ্যাক্সেস অস্বীকার।' : 'Camera/mic access denied. Check browser settings.')
        : (bn ? 'ক্যামেরা পাওয়া যায়নি।' : 'Camera or microphone not found.'));
    } finally { setIsConnecting(false); }
  };

  const stopCall = async () => {
    cleanupCall();
    const cid = consultIdRef.current;
    if (cid) {
      try {
        await fetch(`/api/teleconsult/${cid}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ notes }),
        });
      } catch (_) {}
    }
    setIsCallActive(false);
    setConsultId(null); setJoinToken(null); setRoomId(null);
    consultIdRef.current = null; joinTokenRef.current = null; roomIdRef.current = null;
    setRemoteConnected(false); setConnectionQuality('connecting');
    setShowSharePanel(false); lastSigRef.current = 0;
    fetchHistory();
    if (onEnd) onEnd();
  };

  const toggleVideo = () => {
    const tracks = streamRef.current?.getVideoTracks();
    if (tracks?.length) { const n = !isVideoOn; tracks.forEach(t => { t.enabled = n; }); setIsVideoOn(n); }
  };

  const toggleMute = () => {
    const tracks = streamRef.current?.getAudioTracks();
    if (tracks?.length) { const n = !isMuted; tracks.forEach(t => { t.enabled = !n; }); setIsMuted(n); }
  };

  const saveNotes = async () => {
    const cid = consultIdRef.current;
    if (!cid) return;
    try {
      await fetch(`/api/teleconsult/${cid}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes }),
      });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (_) {}
  };

  const joinUrl = joinToken ? `${window.location.origin}/?join=${joinToken}` : null;

  const qualityConfig = {
    connecting: { color: '#94A3B8', dot: 'bg-slate-400', label: bn ? 'অপেক্ষায়' : 'Waiting' },
    good:       { color: '#2ECC71', dot: 'bg-emerald-400', label: bn ? 'ভালো' : 'Good' },
    fair:       { color: '#F39C12', dot: 'bg-amber-400', label: bn ? 'মোটামুটি' : 'Fair' },
    poor:       { color: '#EF4444', dot: 'bg-red-400', label: bn ? 'দুর্বল' : 'Poor' },
  }[connectionQuality];

  // ── Patient picker screen ────────────────────────────────────────────────────
  if (!selectedPatient && user?.role === 'doctor') {
    return (
      <PatientPicker
        patients={patients} loading={loadingPatients}
        onSelect={(p) => setSelectedPatient(p)} bn={bn}
      />
    );
  }

  // ── Main teleconsult UI ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-10 max-w-7xl mx-auto">

      {/* ── Page Header ── */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 px-6 pt-5 pb-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0F4A63,#1A6B8A)', borderRadius: '0 0 2rem 2rem' }}>
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 15% 50%,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/15 border border-white/10 text-white text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
                {bn ? 'নিরাপদ ভিডিও কল' : 'Secure Video Call'}
              </span>
              {isCallActive && (
                <span className="flex items-center gap-1.5 bg-red-500/20 border border-red-400/30 text-red-300 text-[10px] font-black px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  LIVE · {formatDuration(callDuration)}
                </span>
              )}
            </div>
            <h1 className="text-xl font-black text-white">
              {selectedPatient?.name
                ? `${bn ? 'রোগী:' : 'Consulting:'} ${selectedPatient.name}`
                : (bn ? 'টেলিকনসালটেশন' : 'Teleconsultation')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {!isCallActive && !patientId && (
              <button onClick={() => { setSelectedPatient(null); fetchPatients(); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/10">
                {bn ? 'রোগী পরিবর্তন' : 'Change Patient'}
              </button>
            )}
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 px-3 py-2 rounded-xl">
              <span className={`w-2 h-2 rounded-full ${qualityConfig.dot}`} />
              <span className="text-white text-xs font-bold">{qualityConfig.label}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Video + Controls ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Video panel */}
          <div className={`relative rounded-3xl overflow-hidden select-none shadow-2xl ${isFullscreen ? 'fixed inset-4 z-50' : 'aspect-video'}`}
            style={{ background: 'linear-gradient(145deg,#0a0f1a,#111827)' }}>

            {/* Remote video */}
            <video ref={remoteVideoRef} autoPlay playsInline
              className={`w-full h-full object-cover transition-opacity duration-500 ${remoteConnected ? 'opacity-100' : 'opacity-0'}`} />

            {/* Waiting / pre-call overlay */}
            {!remoteConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                {isCallActive ? (
                  <>
                    <video autoPlay playsInline muted
                      className="absolute inset-0 w-full h-full object-cover opacity-20"
                      ref={(el) => { if (el && streamRef.current) el.srcObject = streamRef.current; }} />
                    <div className="relative z-10 text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto">
                        <Loader2 className="w-7 h-7 animate-spin text-white/70" />
                      </div>
                      <div>
                        <p className="text-sm font-bold opacity-80">{bn ? 'রোগীর সংযোগের অপেক্ষায়...' : 'Waiting for patient to join...'}</p>
                        <p className="text-xs opacity-40 mt-1">{bn ? 'ইনভাইট লিঙ্ক শেয়ার করুন' : 'Share the invite link below'}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                      <Video className="w-10 h-10 opacity-20" />
                    </div>
                    <div>
                      <p className="text-base font-bold opacity-40">{bn ? 'কল শুরু হয়নি' : 'Ready to connect'}</p>
                      <p className="text-xs opacity-25 mt-1">{bn ? 'নিচের বোতামে ক্লিক করুন' : 'Click Start Call below'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Overlays: quality + timer */}
            {isCallActive && (
              <>
                <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-xs font-bold"
                  style={{ color: qualityConfig.color }}>
                  <span className={`w-2 h-2 rounded-full ${qualityConfig.dot}`} />
                  {qualityConfig.label}
                </div>
                <div className="absolute top-4 right-14 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {formatDuration(callDuration)}
                </div>
              </>
            )}

            {/* Fullscreen toggle */}
            <button onClick={() => setIsFullscreen(f => !f)}
              className="absolute top-4 right-4 z-20 p-2 bg-black/40 backdrop-blur-sm text-white/70 hover:text-white rounded-xl transition-all">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Local PiP */}
            <div className="absolute bottom-4 right-4 z-20">
              <video ref={localVideoRef} autoPlay playsInline muted
                className={`w-28 h-20 rounded-xl object-cover border-2 border-white/20 shadow-xl transition-opacity ${isCallActive ? 'opacity-100' : 'opacity-0'}`} />
              {!isVideoOn && isCallActive && (
                <div className="absolute inset-0 bg-slate-800/90 rounded-xl flex items-center justify-center">
                  <VideoOff className="w-5 h-5 text-slate-400" />
                </div>
              )}
            </div>

            {/* Connected badge */}
            {remoteConnected && (
              <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white text-xs font-bold">{selectedPatient?.name || 'Patient'} {bn ? 'সংযুক্ত' : 'connected'}</span>
              </div>
            )}
          </div>

          {/* Media error */}
          <AnimatePresence>
            {mediaError && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {mediaError}
                <button onClick={() => setMediaError('')} className="ml-auto text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls bar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {!isCallActive ? (
                <button onClick={startCall} disabled={isConnecting}
                  className="flex items-center gap-2.5 px-8 py-3.5 text-white rounded-2xl font-bold transition-all disabled:opacity-50 min-h-[52px] shadow-lg shadow-emerald-500/20 active:scale-95"
                  style={{ background: isConnecting ? '#94A3B8' : '#2ECC71' }}>
                  {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Phone className="w-5 h-5" />}
                  {isConnecting ? (bn ? 'সংযোগ হচ্ছে...' : 'Connecting...') : (bn ? 'কল শুরু করুন' : 'Start Call')}
                </button>
              ) : (
                <>
                  {/* Mute */}
                  <button onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}
                    className={`p-3.5 rounded-2xl transition-all active:scale-95 ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  {/* Video */}
                  <button onClick={toggleVideo} title={isVideoOn ? 'Disable video' : 'Enable video'}
                    className={`p-3.5 rounded-2xl transition-all active:scale-95 ${!isVideoOn ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                  {/* Share */}
                  <button onClick={() => setShowSharePanel(v => !v)}
                    className={`p-3.5 rounded-2xl transition-all active:scale-95 ${showSharePanel ? 'bg-[#1A6B8A] text-white shadow-lg shadow-[#1A6B8A]/25' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    title={bn ? 'ইনভাইট লিঙ্ক' : 'Invite link'}>
                    <Link className="w-5 h-5" />
                  </button>
                  {/* End Call */}
                  <button onClick={stopCall}
                    className="flex items-center gap-2 px-6 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/30 active:scale-95">
                    <PhoneOff className="w-5 h-5" />
                    {bn ? 'কল শেষ' : 'End Call'}
                  </button>
                </>
              )}
            </div>

            {/* Labels under buttons */}
            {isCallActive && (
              <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium w-[52px] text-center">{isMuted ? (bn ? 'মিউট' : 'Muted') : (bn ? 'মাইক চালু' : 'Mic on')}</span>
                <span className="text-[10px] text-slate-400 font-medium w-[52px] text-center">{isVideoOn ? (bn ? 'ক্যামেরা' : 'Camera') : (bn ? 'বন্ধ' : 'Off')}</span>
                <span className="text-[10px] text-slate-400 font-medium w-[52px] text-center">{bn ? 'ইনভাইট' : 'Invite'}</span>
              </div>
            )}
          </div>

          {/* Share panel */}
          <AnimatePresence>
            {showSharePanel && joinUrl && (
              <SharePanel joinUrl={joinUrl} onClose={() => setShowSharePanel(false)} bn={bn} />
            )}
          </AnimatePresence>

          {/* Notes + History tabs */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100">
              {[{ id: 'notes', en: 'Consultation Notes', bn: 'নোট' }, { id: 'history', en: 'Previous Consultations', bn: 'পূর্ববর্তী' }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === tab.id
                    ? 'text-[#1A6B8A] border-[#1A6B8A] bg-[#1A6B8A]/5'
                    : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
                  {bn ? tab.bn : tab.en}
                </button>
              ))}
            </div>
            <div className="p-4">
              {activeTab === 'notes' ? (
                <ConsultNotes notes={notes} setNotes={setNotes} onSave={saveNotes} saved={notesSaved} bn={bn} />
              ) : (
                <div className="space-y-2.5">
                  {history.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-medium">{bn ? 'কোনো পূর্ববর্তী কনসালটেশন নেই' : 'No previous consultations'}</p>
                    </div>
                  ) : history.slice(0, 8).map(h => (
                    <div key={h.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-[#1A6B8A]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Video className="w-4 h-4 text-[#1A6B8A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">{h.patient_name || h.doctor_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(h.start_time).toLocaleDateString(bn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {' · '}
                          <span className={h.status === 'ended' ? 'text-emerald-600 font-semibold' : 'text-amber-500 font-semibold'}>{h.status}</span>
                        </p>
                        {h.notes && <p className="text-xs text-slate-500 mt-1 italic line-clamp-2">{h.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-5">
          <PatientSummary patientData={patientData} bn={bn} />

          {/* Tips card (shown before call starts) */}
          {!isCallActive && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <p className="text-xs font-black text-slate-600 uppercase tracking-widest">{bn ? 'কলের আগে' : 'Before the Call'}</p>
              {[
                { icon: '🎤', en: 'Ensure mic & camera are allowed in browser', bn: 'ব্রাউজারে মাইক ও ক্যামেরার অনুমতি দিন' },
                { icon: '📡', en: 'Share the invite link via WhatsApp or SMS', bn: 'WhatsApp বা SMS এ লিঙ্ক পাঠান' },
                { icon: '🔒', en: 'Sessions are encrypted and ephemeral', bn: 'সেশনটি এনক্রিপ্টেড ও একবার ব্যবহারযোগ্য' },
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-lg leading-none">{tip.icon}</span>
                  <p className="text-xs text-slate-500 leading-relaxed">{bn ? tip.bn : tip.en}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
