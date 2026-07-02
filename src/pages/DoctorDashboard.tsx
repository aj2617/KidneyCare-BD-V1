import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Users, Search, Bell, ChevronRight, AlertCircle,
  Activity, Clock, X, UserPlus, UserMinus, CheckCircle2, Loader2,
  FlaskConical, ChevronDown, ChevronUp, Syringe, Video,
  AlertTriangle, Check, Heart, MapPin,
  RefreshCw, Filter, BarChart3,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function timeAgo(dateStr: string | null, bn: boolean): string {
  if (!dateStr) return bn ? 'কখনো নয়' : 'Never';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return bn ? `${mins}মি আগে` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return bn ? `${hrs}ঘ আগে` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return bn ? `${days}দ আগে` : `${days}d ago`;
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function getRiskConfig(score: number) {
  if (score <= 25) return { label: 'Low', labelBn: 'কম', dot: '#2ECC71', bg: 'rgba(46,204,113,0.1)', color: '#1a7a44', border: '#2ECC71', ring: 'ring-emerald-200' };
  if (score <= 50) return { label: 'Moderate', labelBn: 'মাঝারি', dot: '#F39C12', bg: 'rgba(243,156,18,0.1)', color: '#7d5100', border: '#F39C12', ring: 'ring-amber-200' };
  if (score <= 75) return { label: 'High', labelBn: 'উচ্চ', dot: '#F39C12', bg: 'rgba(243,156,18,0.12)', color: '#7d5100', border: '#F39C12', ring: 'ring-amber-200' };
  return { label: 'Critical', labelBn: 'সংকটাপন্ন', dot: '#E74C3C', bg: 'rgba(231,76,60,0.1)', color: '#7b1a1a', border: '#E74C3C', ring: 'ring-red-200' };
}

const FILTERS = [
  { id: 'all', en: 'All Patients', bn: 'সকল রোগী' },
  { id: 'critical', en: 'Critical', bn: 'সংকটাপন্ন' },
  { id: 'stage3plus', en: 'CKD 3+', bn: 'সিকেডি ৩+' },
  { id: 'unlogged7', en: 'Overdue 7d', bn: '৭+ দিন বাকি' },
  { id: 'diabetes', en: 'Diabetic', bn: 'ডায়াবেটিস' },
];

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }: { toast: { type: 'success'|'error'; title: string; detail?: string }; onClose: () => void }) {
  const isSuccess = toast.type === 'success';
  return (
    <motion.div
      initial={{ opacity: 0, y: -24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      className="fixed top-4 right-4 z-[9999] max-w-sm w-full shadow-2xl rounded-2xl overflow-hidden"
      style={{ background: '#fff', border: `2px solid ${isSuccess ? '#2ECC71' : '#E74C3C'}` }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: isSuccess ? '#EAFAF1' : '#FEF2F2' }}>
          {isSuccess
            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            : <AlertTriangle className="w-5 h-5 text-red-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800">{toast.title}</p>
          {toast.detail && <p className="text-xs text-slate-400 mt-0.5 truncate">{toast.detail}</p>}
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-500 p-1 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ value, label, sub, icon: Icon, color, pulse, onClick }: {
  value: string | number; label: string; sub: string;
  icon: any; color: string; pulse?: boolean; onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 12px 32px rgba(0,0,0,0.10)' }}
      onClick={onClick}
      className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center justify-between relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
      {pulse && (
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full blur-2xl opacity-10 animate-pulse"
          style={{ background: color, transform: 'translate(30%,-30%)' }} />
      )}
      <div className="relative z-10">
        <p className="text-3xl font-black tracking-tight" style={{ color }}>{value}</p>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{label}</p>
        <p className="text-xs text-slate-400 font-medium mt-0.5">{sub}</p>
      </div>
      <div className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: `${color}15`, color }}>
        <Icon className={`w-6 h-6 ${pulse ? 'animate-pulse' : ''}`} />
      </div>
    </motion.div>
  );
}

// ── Patient Card ──────────────────────────────────────────────────────────────
function PatientCard({ patient, onSelect, onUnassign, confirmingUnassign, setConfirming, user, bn }: any) {
  const risk = getRiskConfig(patient.risk_score || 0);
  const initials = (patient.name || '?').split(' ').filter(Boolean).slice(0, 2).map((n: string) => n[0].toUpperCase()).join('');
  const gfr = patient.latest_gfr ? Math.round(patient.latest_gfr) : null;
  const overdue = daysSince(patient.last_vitals_date) >= 7;
  const loggedAgo = timeAgo(patient.last_vitals_date, bn);
  const isMine = patient.assigned_doctor_id === user?.id;
  const isConfirming = confirmingUnassign === patient.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
      className="group bg-white rounded-2xl border border-slate-100 hover:border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
      style={{ borderLeftWidth: 3, borderLeftColor: risk.border }}
    >
      <div className="flex items-center gap-3">
        <div
          onClick={() => onSelect({ id: patient.id, name: patient.name })}
          className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0 cursor-pointer shadow-sm"
          style={{ background: `linear-gradient(135deg, ${risk.border}dd, ${risk.border}88)` }}
        >
          {initials}
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onSelect({ id: patient.id, name: patient.name })}
              className="font-black text-slate-800 text-sm hover:text-[#1A6B8A] transition-colors"
            >
              {patient.name}
            </button>
            {patient.diabetes === 1 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">DM</span>
            )}
            {patient.hypertension === 1 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">HTN</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
            {patient.age && <span>{patient.age}y {patient.sex ? `· ${patient.sex}` : ''}</span>}
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{patient.district || '—'}</span>
            <span className={`flex items-center gap-1 font-semibold ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
              <Clock className="w-3 h-3" />{loggedAgo}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-14 sm:pl-0">
        {/* eGFR */}
        <div className="text-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 min-w-[58px]">
          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">eGFR</span>
          <span className="text-base font-black text-slate-800 leading-tight">{gfr ?? '—'}</span>
        </div>

        {/* Risk */}
        <div className="px-3 py-1.5 rounded-xl text-center border min-w-[76px]"
          style={{ backgroundColor: risk.bg, color: risk.color, borderColor: risk.border }}>
          <span className="block text-[9px] font-black uppercase tracking-widest opacity-75">Risk</span>
          <span className="text-xs font-black">{bn ? risk.labelBn : risk.label}</span>
        </div>

        {/* Stage */}
        <div className="bg-[#EFF8FB] text-[#1A6B8A] border border-[#1A6B8A]/15 px-3 py-1.5 rounded-xl text-center min-w-[52px]">
          <span className="block text-[9px] font-black uppercase tracking-widest leading-none">Stage</span>
          <span className="text-sm font-black block mt-0.5">{patient.ckd_stage ? `G${patient.ckd_stage}` : '—'}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {isConfirming ? (
            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-100">
              <span className="text-[10px] font-black text-red-600 px-1.5">Confirm?</span>
              <button onClick={() => onUnassign(patient.id)}
                className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setConfirming(null)}
                className="p-1 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-all">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => onSelect({ id: patient.id, name: patient.name })}
                className="p-2 bg-slate-50 hover:bg-[#1A6B8A]/10 text-slate-400 hover:text-[#1A6B8A] rounded-xl transition-all"
                title="View patient">
                <ChevronRight className="w-5 h-5" />
              </button>
              {isMine && (
                <button onClick={() => setConfirming(patient.id)}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-xl transition-all"
                  title="Remove from panel">
                  <UserMinus className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Alerts Panel ──────────────────────────────────────────────────────────────
function AlertsPanel({ alerts, loading, onMarkRead, onMarkAllRead, onSelectPatient, language }: {
  alerts: any[]; loading: boolean;
  onMarkRead: (id: number) => void; onMarkAllRead: () => void;
  onSelectPatient: (p: { id: number; name?: string }) => void; language: string;
}) {
  const bn = language === 'bn';
  const unread = alerts.filter(a => !a.is_read);
  const critical = alerts.filter(a => !a.is_read && a.type === 'CRITICAL');
  const warnings = alerts.filter(a => !a.is_read && a.type !== 'CRITICAL');
  const readAlerts = alerts.filter(a => a.is_read).slice(0, 4);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden sticky top-4">
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg,#1A6B8A08,#1A6B8A04)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#1A6B8A]/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-[#1A6B8A]" />
          </div>
          <span className="font-black text-slate-900 text-sm">{bn ? 'সতর্কতা' : 'Clinical Alerts'}</span>
          {unread.length > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full animate-pulse">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button onClick={onMarkAllRead}
            className="text-[11px] font-bold text-[#1A6B8A] hover:underline">
            {bn ? 'সব পঠিত' : 'Mark all read'}
          </button>
        )}
      </div>

      <div className="max-h-[520px] overflow-y-auto p-3 space-y-2">
        {loading && [1,2,3].map(i => (
          <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
        ))}

        {!loading && unread.length === 0 && (
          <div className="text-center py-10">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400 opacity-60" />
            <p className="text-xs font-bold text-slate-500">{bn ? 'কোনো নতুন সতর্কতা নেই' : 'All Clear!'}</p>
          </div>
        )}

        {critical.length > 0 && (
          <div>
            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1.5 px-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
              {bn ? 'সংকটাপন্ন' : 'Critical Flags'}
            </p>
            {critical.map(a => <AlertCard key={a.id} alert={a} onMarkRead={onMarkRead} onSelectPatient={onSelectPatient} />)}
          </div>
        )}

        {warnings.length > 0 && (
          <div>
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 px-1 mt-2">
              {bn ? 'সাধারণ সতর্কতা' : 'Warnings'}
            </p>
            {warnings.map(a => <AlertCard key={a.id} alert={a} onMarkRead={onMarkRead} onSelectPatient={onSelectPatient} />)}
          </div>
        )}

        {readAlerts.length > 0 && (
          <div className="opacity-40">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 mt-2">
              {bn ? 'পঠিত' : 'Resolved'}
            </p>
            {readAlerts.map(a => <AlertCard key={a.id} alert={a} onMarkRead={onMarkRead} onSelectPatient={onSelectPatient} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert, onMarkRead, onSelectPatient }: any) {
  const isCritical = alert.type === 'CRITICAL';
  return (
    <div className={`group relative rounded-xl p-3 mb-1.5 border transition-all cursor-pointer`}
      style={!alert.is_read ? {
        background: isCritical ? '#FEFCE8' : '#FEF9F0',
        borderColor: isCritical ? '#FADBD8' : '#FDEBD0',
      } : { background: '#F8FAFC', borderColor: '#F1F5F9' }}
      onClick={() => alert.patient_id && onSelectPatient({ id: alert.patient_id, name: alert.patient_name })}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">
          {isCritical
            ? <AlertCircle className="w-4 h-4 text-red-500" />
            : <AlertTriangle className="w-4 h-4 text-amber-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-xs text-slate-800 leading-tight">{alert.patient_name}</p>
          <p className="text-[11px] text-slate-600 leading-snug mt-0.5 font-medium">{alert.message}</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
            {new Date(alert.triggered_at).toLocaleDateString()}
          </p>
        </div>
        {!alert.is_read && (
          <button onClick={(e) => { e.stopPropagation(); onMarkRead(alert.id); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-emerald-500">
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Assign Patient Modal ──────────────────────────────────────────────────────
function AssignPatientModal({ token, language, onClose, onAssigned }: {
  token: string; language: string; onClose: () => void; onAssigned: () => void;
}) {
  const bn = language === 'bn';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [assigned, setAssigned] = useState<Set<number>>(new Set());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  const doSearch = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/doctor/unassigned-patients?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(await res.json());
    } catch { setResults([]); } finally { setLoading(false); }
  };

  const assign = async (patientId: number) => {
    setAssigning(patientId);
    try {
      const res = await fetch('/api/doctor/assign-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patient_id: patientId }),
      });
      if (res.ok) {
        setAssigned(prev => new Set([...prev, patientId]));
        setResults(prev => prev.filter(p => p.id !== patientId));
        onAssigned();
      }
    } finally { setAssigning(null); }
  };

  return (
    <>
      <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80]" onClick={onClose} />
      <motion.div key="modal"
        initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 24 }}
        className="fixed inset-x-4 top-[8%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-[90] bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '82vh' }}
      >
        <div className="px-5 pt-5 pb-3 border-b border-slate-100"
          style={{ background: 'linear-gradient(135deg,#1A6B8A08,transparent)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-black text-slate-800 text-base">{bn ? 'রোগী যুক্ত করুন' : 'Assign Patient'}</h2>
                <p className="text-xs text-slate-400">{bn ? 'নাম বা জেলা দিয়ে খুঁজুন' : 'Search by name or district'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder={bn ? 'নাম বা জেলা...' : 'Search clinical database...'}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3 space-y-2" style={{ maxHeight: '50vh' }}>
          {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#1A6B8A]" /></div>}
          {!loading && results.length === 0 && (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-400">{bn ? 'কোনো রোগী নেই' : 'No unassigned patients found'}</p>
            </div>
          )}
          {!loading && results.map(patient => {
            const isAssigning = assigning === patient.id;
            const wasAssigned = assigned.has(patient.id);
            const risk = getRiskConfig(patient.risk_score || 0);
            return (
              <motion.div key={patient.id} layout
                className="flex items-center justify-between gap-3 p-3 bg-slate-50 hover:bg-slate-100/60 rounded-2xl border border-slate-100 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0"
                    style={{ background: risk.border }}>
                    {patient.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">{patient.name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {patient.district}{patient.age ? ` · ${patient.age}y` : ''}{patient.sex ? ` · ${patient.sex}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:block text-[10px] font-black px-2 py-0.5 rounded-full border"
                    style={{ background: risk.bg, color: risk.color, borderColor: risk.border }}>
                    {risk.label}
                  </span>
                  <button onClick={() => assign(patient.id)} disabled={isAssigning || wasAssigned}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[36px] disabled:opacity-70"
                    style={wasAssigned
                      ? { background: '#EAFAF1', color: '#1a7a44', border: '1px solid #2ECC71' }
                      : { background: '#2ECC71', color: '#fff' }}>
                    {isAssigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : wasAssigned ? <CheckCircle2 className="w-3.5 h-3.5" />
                      : <UserPlus className="w-3.5 h-3.5" />}
                    {wasAssigned ? (bn ? 'যুক্ত' : 'Assigned') : (bn ? 'যুক্ত করুন' : 'Assign')}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}

// ── Pending Labs Panel ────────────────────────────────────────────────────────
function PendingLabsPanel({ labs, loading, onSelect, bn }: {
  labs: any[]; loading: boolean; onSelect: (p: any) => void; bn: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  if (!loading && labs.length === 0) return null;
  return (
    <div className="rounded-2xl overflow-hidden border shadow-sm" style={{ borderColor: '#F39C12', background: '#FFFDF9' }}>
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 border-b border-amber-100"
        style={{ background: 'linear-gradient(135deg,#FEF9F0,#FFFDF9)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/20">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-slate-900">{bn ? 'ল্যাব পরীক্ষা বাকি' : 'Overdue GFR / Creatinine Labs'}</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              {loading ? (bn ? 'লোড হচ্ছে...' : 'Analyzing...')
                : `${labs.length} ${bn ? 'জন রোগী ৩০+ দিনের বেশি সময় ধরে' : `patient${labs.length !== 1 ? 's' : ''} — no GFR test in 30 days`}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!loading && <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500 text-white">{labs.length}</span>}
          {expanded ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
              {loading && [1,2,3].map(i => <div key={i} className="h-14 bg-white/70 rounded-xl animate-pulse" />)}
              {!loading && labs.map((p, i) => {
                const riskColor = p.risk_score > 75 ? '#E74C3C' : p.risk_score > 50 ? '#F39C12' : '#2ECC71';
                const initials = (p.name||'?').split(' ').filter(Boolean).slice(0,2).map((n:string)=>n[0].toUpperCase()).join('');
                return (
                  <motion.div key={p.patient_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-white rounded-xl border border-amber-100 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-amber-200 transition-all shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                        style={{ background: riskColor }}>{initials}</div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-900">{p.name}</span>
                          {p.ckd_stage && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">G{p.ckd_stage}</span>}
                        </div>
                        <div className="text-xs text-rose-600 font-bold mt-0.5">
                          {p.days_since_creatinine !== null
                            ? (bn ? `${p.days_since_creatinine} দিন টেস্ট নেই` : `Overdue: ${p.days_since_creatinine} days`)
                            : (bn ? 'কোনো টেস্টের ইতিহাস নেই' : 'No test history')}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => onSelect({ id: p.patient_id, name: p.name })}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95">
                      <Syringe className="w-3.5 h-3.5" />
                      {bn ? 'টেস্টের অর্ডার' : 'Order Lab'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DoctorDashboard({ onSelectPatient }: { onSelectPatient: (p: { id: number; name?: string }) => void }) {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [patients, setPatients] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [pendingLabs, setPendingLabs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [labsLoading, setLabsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [assignedOnly, setAssignedOnly] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [confirmingUnassign, setConfirmingUnassign] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success'|'error'; title: string; detail?: string } | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const showToast = useCallback((type: 'success'|'error', title: string, detail?: string) => {
    setToast({ type, title, detail });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLabsLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [pRes, aRes, lRes] = await Promise.all([
        fetch(`/api/doctor/patients?assignedOnly=${assignedOnly}`, { headers }),
        fetch('/api/doctor/alerts', { headers }),
        fetch(`/api/doctor/pending-labs?assignedOnly=${assignedOnly}`, { headers }),
      ]);
      setPatients(await pRes.json());
      setAlerts(await aRes.json());
      const labData = await lRes.json();
      setPendingLabs(Array.isArray(labData) ? labData : []);
      setLastRefresh(new Date());
    } catch {
      showToast('error', bn ? 'ডেটা লোড করতে ব্যর্থ' : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setLabsLoading(false);
    }
  }, [assignedOnly, token, bn]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const markAllRead = async () => {
    try {
      await fetch('/api/doctor/alerts/read', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      showToast('success', bn ? 'সব সতর্কতা পঠিত চিহ্নিত' : 'All alerts marked as read');
      fetchData();
    } catch { showToast('error', bn ? 'আপডেট করতে ব্যর্থ' : 'Failed to update alerts'); }
  };

  const markRead = async (alertId: number) => {
    try {
      await fetch('/api/doctor/alerts/read', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ alertId }),
      });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
    } catch { showToast('error', bn ? 'আপডেট করতে ব্যর্থ' : 'Failed to update alert'); }
  };

  const performUnassign = async (patientId: number) => {
    try {
      const res = await fetch('/api/doctor/unassign-patient', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patient_id: patientId }),
      });
      if (res.ok) {
        showToast('success', bn ? 'রোগী সফলভাবে বাদ দেওয়া হয়েছে' : 'Patient removed from panel');
        setConfirmingUnassign(null);
        fetchData();
      } else throw new Error();
    } catch { showToast('error', bn ? 'রোগী বাদ দিতে ব্যর্থ' : 'Failed to unassign patient'); }
  };

  const filtered = useMemo(() => {
    return patients.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.district||'').toLowerCase().includes(q);
      let matchFilter = true;
      if (activeFilter === 'critical') matchFilter = p.risk_score > 75;
      if (activeFilter === 'stage3plus') matchFilter = (p.ckd_stage||0) >= 3;
      if (activeFilter === 'unlogged7') matchFilter = daysSince(p.last_vitals_date) >= 7;
      if (activeFilter === 'diabetes') matchFilter = p.diabetes === 1;
      return matchSearch && matchFilter;
    });
  }, [patients, search, activeFilter]);

  const unread = alerts.filter(a => !a.is_read);
  const criticalPts = patients.filter(p => p.risk_score > 75).length;
  const overduePts = patients.filter(p => daysSince(p.last_vitals_date) >= 7).length;
  const now = new Date();
  const greeting = now.getHours() < 12 ? (bn ? 'সুপ্রভাত' : 'Good morning')
    : now.getHours() < 17 ? (bn ? 'শুভ বিকেল' : 'Good afternoon')
    : (bn ? 'শুভ সন্ধ্যা' : 'Good evening');
  const rawName = user?.name || 'Doctor';
  const cleanName = rawName.replace(/^Dr\.?\s+/i, '');
  const docFirst = cleanName.split(' ')[0];

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── PREMIUM HEADER ── */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 px-6 pt-6 pb-7 mb-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F4A63 0%, #1A6B8A 50%, #1e8aad 100%)', borderRadius: '0 0 2.5rem 2.5rem' }}>
        {/* Animated background patterns */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7ECDE8, transparent)', transform: 'translate(30%,-30%)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #2ECC71, transparent)', transform: 'translate(-30%, 30%)' }} />

        <div className="relative z-10">
          {/* Top row */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase border border-white/10">
                  KidneyCare MD Console
                </span>
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
                {bn ? `${greeting}, ডাঃ ${docFirst}` : `${greeting}, Dr. ${docFirst}`} 👋
              </h1>
              <p className="text-white/60 text-sm mt-1 font-medium">
                {new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Scope switcher */}
              <div className="bg-white/10 backdrop-blur-sm p-1 rounded-2xl flex border border-white/10">
                <button onClick={() => setAssignedOnly(true)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${assignedOnly ? 'bg-white text-[#1A6B8A] shadow-md' : 'text-white/80 hover:bg-white/10'}`}>
                  <Heart className="w-3.5 h-3.5" />{bn ? 'আমার রোগী' : 'My Patients'}
                </button>
                <button onClick={() => setAssignedOnly(false)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${!assignedOnly ? 'bg-white text-[#1A6B8A] shadow-md' : 'text-white/80 hover:bg-white/10'}`}>
                  <Users className="w-3.5 h-3.5" />{bn ? 'সব রোগী' : 'All Patients'}
                </button>
              </div>
              {/* Assign button */}
              <button onClick={() => setShowAssign(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold text-xs transition-all shadow-lg shadow-emerald-950/20 active:scale-95 whitespace-nowrap">
                <UserPlus className="w-4 h-4" />{bn ? 'রোগী যুক্ত করুন' : 'Assign Patient'}
              </button>
              {/* Refresh */}
              <button onClick={fetchData} disabled={isLoading}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick stats chips */}
          <div className="flex gap-3 mt-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {[
              { val: patients.length, label: bn ? 'রোগী' : 'Patients', icon: Users, color: 'rgba(255,255,255,0.2)' },
              { val: criticalPts, label: bn ? 'সংকটাপন্ন' : 'Critical', icon: AlertCircle, color: criticalPts > 0 ? 'rgba(231,76,60,0.6)' : 'rgba(255,255,255,0.15)', urgent: criticalPts > 0 },
              { val: unread.length, label: bn ? 'অ্যালার্ট' : 'Alerts', icon: Bell, color: unread.length > 0 ? 'rgba(243,156,18,0.6)' : 'rgba(255,255,255,0.15)', urgent: unread.length > 0 },
              { val: overduePts, label: bn ? 'বাকি' : 'Overdue', icon: Clock, color: overduePts > 0 ? 'rgba(231,76,60,0.5)' : 'rgba(255,255,255,0.15)', urgent: overduePts > 0 },
              { val: pendingLabs.length, label: bn ? 'ল্যাব বাকি' : 'Labs Due', icon: FlaskConical, color: pendingLabs.length > 0 ? 'rgba(243,156,18,0.5)' : 'rgba(255,255,255,0.15)' },
            ].map(({ val, label, icon: Icon, color, urgent }) => (
              <div key={label} className="shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-white"
                style={{ background: color, borderColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
                <Icon className={`w-4 h-4 ${urgent ? 'animate-pulse' : 'opacity-80'}`} />
                <div>
                  <span className="text-lg font-black leading-none">{isLoading ? '—' : val}</span>
                  <span className="text-[10px] font-medium opacity-80 block">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard value={isLoading ? '—' : patients.length} label={bn ? 'মোট রোগী' : 'Total Patients'}
          sub={assignedOnly ? (bn ? 'আপনার প্যানেল' : 'Your panel') : (bn ? 'সারাদেশ' : 'Nationwide')}
          icon={Users} color="#1A6B8A" />
        <KpiCard value={isLoading ? '—' : criticalPts} label={bn ? 'সংকটাপন্ন' : 'Critical Risk'}
          sub={bn ? 'ঝুঁকি স্কোর >75' : 'Risk score > 75'}
          icon={AlertCircle} color="#E74C3C" pulse={criticalPts > 0}
          onClick={() => setActiveFilter('critical')} />
        <KpiCard value={isLoading ? '—' : unread.length} label={bn ? 'অ্যালার্ট' : 'Active Alerts'}
          sub={bn ? 'পর্যালোচনা প্রয়োজন' : 'Requires review'}
          icon={Bell} color="#F39C12" pulse={unread.length > 0}
          onClick={() => setShowAlerts(true)} />
        <KpiCard value={isLoading ? '—' : overduePts} label={bn ? 'মনিটরিং বাকি' : 'Overdue Vitals'}
          sub={bn ? '৭+ দিন ধরে কোনো লগ নেই' : 'No log in 7+ days'}
          icon={Activity} color="#7C3AED" pulse={overduePts > 0}
          onClick={() => setActiveFilter('unlogged7')} />
      </div>

      {/* ── PENDING LABS ── */}
      <PendingLabsPanel labs={pendingLabs} loading={labsLoading} onSelect={onSelectPatient} bn={bn} />

      {/* ── SEARCH + FILTERS ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={bn ? 'নাম বা জেলা দিয়ে খুঁজুন...' : 'Search by name or district...'}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A] transition-all" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>{filtered.length} {bn ? 'জন' : 'patients'}</span>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {FILTERS.map(f => {
            const isActive = activeFilter === f.id;
            let badge = null;
            if (f.id === 'critical' && criticalPts > 0) badge = criticalPts;
            if (f.id === 'unlogged7' && overduePts > 0) badge = overduePts;
            return (
              <button key={f.id} onClick={() => setActiveFilter(f.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${isActive
                  ? 'bg-[#1A6B8A] text-white border-[#1A6B8A] shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                {bn ? f.bn : f.en}
                {badge && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${isActive ? 'bg-white/20' : 'bg-red-50 text-red-600'}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN GRID: Patient List + Alerts Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Patient List */}
        <div className="lg:col-span-2 space-y-3">
          {/* Column header */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1A6B8A]" />
              {bn ? 'রোগী তালিকা' : 'Patient Registry'}
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {bn ? `শেষ আপডেট: ` : 'Last updated: '}
              {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse flex gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="flex gap-2">
                  <div className="w-14 h-10 bg-slate-100 rounded-xl" />
                  <div className="w-18 h-10 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold text-sm">{bn ? 'কোনো রোগী পাওয়া যায়নি' : 'No matching patients'}</p>
              <p className="text-xs text-slate-400 mt-1">
                {search ? (bn ? 'অন্য কীওয়ার্ড দিয়ে চেষ্টা করুন' : 'Try a different search term')
                  : (bn ? 'উপরের বোতাম দিয়ে রোগী যুক্ত করুন' : 'Use the Assign Patient button above')}
              </p>
              {!search && (
                <button onClick={() => setShowAssign(true)}
                  className="mt-4 px-4 py-2 bg-[#1A6B8A] text-white rounded-xl text-sm font-bold hover:bg-[#14556e] transition-all">
                  <UserPlus className="w-4 h-4 inline mr-1.5" />
                  {bn ? 'রোগী যুক্ত করুন' : 'Assign a Patient'}
                </button>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map((patient, i) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  onSelect={onSelectPatient}
                  onUnassign={performUnassign}
                  confirmingUnassign={confirmingUnassign}
                  setConfirming={setConfirmingUnassign}
                  user={user}
                  bn={bn}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Alerts Sidebar — desktop */}
        <div className="hidden lg:block">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 px-1 mb-3">
            <Bell className="w-4 h-4 text-[#1A6B8A]" />
            {bn ? 'সতর্কতা' : 'Clinical Alerts'}
          </h2>
          <AlertsPanel
            alerts={alerts} loading={isLoading}
            onMarkRead={markRead} onMarkAllRead={markAllRead}
            onSelectPatient={onSelectPatient} language={language}
          />
          {/* Quick links */}
          <div className="mt-4 space-y-2">
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'teleconsult' }))}
              className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-[#1A6B8A]/30 hover:shadow-sm transition-all group">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Video className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-slate-700 group-hover:text-[#1A6B8A] transition-colors">
                {bn ? 'টেলিকনসালট শুরু করুন' : 'Start Teleconsult'}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-[#1A6B8A] transition-colors" />
            </button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'prescriptions' }))}
              className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-[#1A6B8A]/30 hover:shadow-sm transition-all group">
              <div className="w-8 h-8 rounded-lg bg-[#1A6B8A]/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#1A6B8A]" />
              </div>
              <span className="text-sm font-bold text-slate-700 group-hover:text-[#1A6B8A] transition-colors">
                {bn ? 'নতুন প্রেসক্রিপশন' : 'Issue Prescription'}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-[#1A6B8A] transition-colors" />
            </button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'gfr' }))}
              className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-[#1A6B8A]/30 hover:shadow-sm transition-all group">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-sm font-bold text-slate-700 group-hover:text-[#1A6B8A] transition-colors">
                {bn ? 'জিএফআর ক্যালকুলেটর' : 'GFR Calculator'}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-[#1A6B8A] transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* ── ASSIGN MODAL ── */}
      <AnimatePresence>
        {showAssign && (
          <AssignPatientModal
            token={token!} language={language}
            onClose={() => setShowAssign(false)}
            onAssigned={() => { setShowAssign(false); fetchData(); showToast('success', bn ? 'রোগী সফলভাবে যুক্ত হয়েছে!' : 'Patient assigned successfully!'); }}
          />
        )}
      </AnimatePresence>

      {/* ── MOBILE ALERTS DRAWER ── */}
      <AnimatePresence>
        {showAlerts && (
          <>
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-[60] lg:hidden" onClick={() => setShowAlerts(false)} />
            <motion.div key="drawer" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-[#F4F7FB] rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto pb-8 lg:hidden">
              <div className="sticky top-0 bg-[#F4F7FB] pt-3 px-4 pb-2 flex items-center justify-between">
                <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-black text-slate-900 mt-3">
                  {bn ? 'সতর্কতা' : 'Clinical Alerts'}
                  {unread.length > 0 && <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">{unread.length}</span>}
                </h3>
                <button onClick={() => setShowAlerts(false)} className="p-1.5 text-slate-400 mt-3"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-4 pt-2">
                <AlertsPanel alerts={alerts} loading={isLoading}
                  onMarkRead={markRead} onMarkAllRead={markAllRead}
                  onSelectPatient={(p) => { setShowAlerts(false); onSelectPatient(p); }}
                  language={language} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile FAB for alerts */}
      {!showAlerts && unread.length > 0 && (
        <button onClick={() => setShowAlerts(true)}
          className="fixed bottom-24 right-4 lg:hidden z-50 w-14 h-14 bg-[#1A6B8A] text-white rounded-full shadow-xl flex items-center justify-center">
          <Bell className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-black flex items-center justify-center">
            {unread.length}
          </span>
        </button>
      )}
    </div>
  );
}
