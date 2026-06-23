import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Users, Search, Bell, ChevronRight, AlertCircle,
  Activity, Clock, Filter, X, UserPlus, CheckCircle2, Loader2,
  FlaskConical, ChevronDown, ChevronUp, Syringe, ArrowRight
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

const RISK_BORDER: Record<string, string> = {
  Critical: '#E74C3C',
  High: '#F39C12',
  Moderate: '#F39C12',
  Low: '#2ECC71',
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'stage3plus', label: 'Stage 3+' },
  { id: 'unlogged7', label: 'Unlogged >7d' },
];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-slate-200 rounded w-2/3" />
          <div className="h-2.5 bg-slate-100 rounded w-1/2" />
        </div>
        <div className="h-6 w-16 bg-slate-100 rounded-full" />
      </div>
    </div>
  );
}

function getRiskConfig(score: number) {
  if (score <= 25) return { label: 'Low', cls: 'border', dot: 'bg-[#2ECC71]', dotHex: '#2ECC71', bg: '#EAFAF1', color: '#1a7a44', borderColor: '#2ECC71' };
  if (score <= 50) return { label: 'Moderate', cls: 'border', dot: 'bg-[#F39C12]', dotHex: '#F39C12', bg: '#FEF5E7', color: '#7d5100', borderColor: '#F39C12' };
  if (score <= 75) return { label: 'High', cls: 'border', dot: 'bg-[#F39C12]', dotHex: '#F39C12', bg: '#FEF5E7', color: '#7d5100', borderColor: '#F39C12' };
  return { label: 'Critical', cls: 'border', dot: 'bg-[#E74C3C]', dotHex: '#E74C3C', bg: '#FDECEA', color: '#7b1a1a', borderColor: '#E74C3C' };
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function DoctorDashboard({ onSelectPatient }: { onSelectPatient: (id: number) => void }) {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const [patients, setPatients] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [pendingLabs, setPendingLabs] = useState<any[]>([]);
  const [labsExpanded, setLabsExpanded] = useState(true);
  const [labsLoading, setLabsLoading] = useState(true);

  const bn = language === 'bn';

  useEffect(() => { fetchData(); }, [assignedOnly]);

  const fetchData = async () => {
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
    } finally {
      setIsLoading(false);
      setLabsLoading(false);
    }
  };

  const markAllRead = async () => {
    await fetch('/api/doctor/alerts/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    fetchData();
  };

  const markRead = async (alertId: number) => {
    await fetch('/api/doctor/alerts/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ alertId }),
    });
    fetchData();
  };

  const filtered = useMemo(() => {
    return patients.filter(p => {
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.district || '').toLowerCase().includes(q);
      let matchesFilter = true;
      if (activeFilter === 'critical') matchesFilter = p.risk_score > 75;
      if (activeFilter === 'stage3plus') matchesFilter = (p.ckd_stage || 0) >= 3;
      if (activeFilter === 'unlogged7') matchesFilter = daysSince(p.last_vitals_date) >= 7;
      return matchesSearch && matchesFilter;
    });
  }, [patients, search, activeFilter]);

  const unread = alerts.filter(a => !a.is_read);
  const criticalPts = patients.filter(p => p.risk_score > 75).length;

  const docInitials = (user?.name || 'DR')
    .split(' ').slice(0, 2).map((n: string) => n[0].toUpperCase()).join('');

  return (
    <div className="space-y-4">

      {/* ── TEAL HEADER ── */}
      <div
        className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 pt-5 pb-3 mb-0"
        style={{ background: '#1A6B8A', borderRadius: '0 0 1.5rem 1.5rem' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">KidneyCare MD</h1>
            <p className="text-xs text-white/60 mt-0.5">
              {bn ? 'আপনার রোগী প্যানেল' : 'Your patient panel'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Bell */}
            <button
              onClick={() => setShowAlerts(v => !v)}
              className="relative p-1.5"
            >
              <Bell className="w-5 h-5 text-white/90" />
              {unread.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-[#1A6B8A]">
                  {unread.length > 9 ? '9+' : unread.length}
                </span>
              )}
            </button>
            {/* Doctor avatar */}
            <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white text-xs font-black">
              {docInitials}
            </div>
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setAssignedOnly(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              assignedOnly
                ? 'bg-white text-[#1A6B8A] border-white'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {assignedOnly ? (bn ? 'আমার রোগী' : 'My Patients') : (bn ? 'সব রোগী' : 'All Patients')}
          </button>
          <button
            onClick={() => setShowAssign(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white border border-white/20 hover:opacity-90 transition-all"
            style={{ background: '#2ECC71' }}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {bn ? 'রোগী যুক্ত করুন' : 'Find & Assign'}
          </button>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: bn ? 'মোট রোগী' : 'Total Patients', value: patients.length, icon: Users, color: 'text-[#1A6B8A] bg-[#1A6B8A]/10' },
          { label: bn ? 'সংকটাপন্ন' : 'Critical', value: criticalPts, icon: AlertCircle, color: 'bg-[#FDECEA] text-[#E74C3C]' },
          { label: bn ? 'অপঠিত সতর্কতা' : 'Unread Alerts', value: unread.length, icon: Bell, color: 'bg-[#FEF5E7] text-[#F39C12]' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4 flex items-center gap-3 shadow-sm">
            <div className={`p-2 rounded-xl shrink-0 ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black text-slate-900 leading-none">{isLoading ? '—' : stat.value}</p>
              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── PENDING LABS TRIAGE PANEL ── */}
      {(labsLoading || pendingLabs.length > 0) && (
        <div className="rounded-2xl overflow-hidden border shadow-sm"
          style={{ borderColor: '#F39C12', background: '#FFFBF0' }}>
          {/* Header */}
          <button
            onClick={() => setLabsExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3"
            style={{ background: '#FEF5E7' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: '#F39C12', color: '#fff' }}>
                <FlaskConical className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-slate-900 leading-none">
                  {bn ? 'পেন্ডিং ল্যাব পরীক্ষা' : 'Pending Lab Tests'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {labsLoading
                    ? (bn ? 'লোড হচ্ছে...' : 'Loading…')
                    : bn
                      ? `${pendingLabs.length} জন রোগীর ক্রিয়েটিনিন পরীক্ষা ৩০+ দিন বাকি`
                      : `${pendingLabs.length} patient${pendingLabs.length !== 1 ? 's' : ''} overdue for creatinine / GFR test`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!labsLoading && (
                <span className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{ background: '#F39C12', color: '#fff' }}>
                  {pendingLabs.length}
                </span>
              )}
              {labsExpanded
                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                : <ChevronDown className="w-4 h-4 text-slate-400" />
              }
            </div>
          </button>

          {/* Body */}
          <AnimatePresence initial={false}>
            {labsExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.22 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-3 pb-3 pt-2 space-y-2 max-h-72 overflow-y-auto">
                  {labsLoading && (
                    <>
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-14 bg-white/60 rounded-xl animate-pulse" />
                      ))}
                    </>
                  )}
                  {!labsLoading && pendingLabs.map((p, i) => {
                    const riskColor = p.risk_score > 75 ? '#E74C3C' : p.risk_score > 50 ? '#F39C12' : '#2ECC71';
                    const riskBg   = p.risk_score > 75 ? '#FDECEA' : p.risk_score > 50 ? '#FEF5E7' : '#EAFAF1';
                    const riskLabel = p.risk_score > 75 ? (bn ? 'সংকটাপন্ন' : 'Critical')
                      : p.risk_score > 50 ? (bn ? 'উচ্চ' : 'High')
                      : (bn ? 'মধ্যম' : 'Moderate');
                    const initials = (p.name || '?').split(' ').slice(0, 2).map((n: string) => n[0].toUpperCase()).join('');
                    const daysOverdue = p.days_since_creatinine;
                    const hasSymptoms = p.fatigue || p.edema;

                    return (
                      <motion.div
                        key={p.patient_id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="bg-white rounded-xl border border-orange-100 p-3 flex items-center gap-3 shadow-sm"
                      >
                        {/* Avatar */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: riskColor }}
                        >
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{p.name}</span>
                            {p.ckd_stage && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                S{p.ckd_stage}
                              </span>
                            )}
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: riskBg, color: riskColor }}>
                              {riskLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-slate-500 truncate">
                              {p.district || '—'}
                            </span>
                            <span className="text-[11px] font-bold"
                              style={{ color: daysOverdue !== null && daysOverdue > 60 ? '#E74C3C' : '#F39C12' }}>
                              {daysOverdue !== null
                                ? (bn ? `${daysOverdue}দ আগে ক্রিয়েটিনিন` : `Cr ${daysOverdue}d ago`)
                                : (bn ? 'ক্রিয়েটিনিন নেই' : 'No creatinine on record')
                              }
                            </span>
                            {hasSymptoms && (
                              <span className="text-[10px] font-bold text-red-500 flex items-center gap-0.5">
                                ⚠ {[p.fatigue && (bn ? 'ক্লান্তি' : 'fatigue'), p.edema && (bn ? 'শোথ' : 'edema')].filter(Boolean).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CTA */}
                        <button
                          onClick={() => onSelectPatient(p.patient_id)}
                          className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
                          style={{ background: '#F39C12' }}
                          title={bn ? 'রোগী দেখুন' : 'Review patient'}
                        >
                          <Syringe className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{bn ? 'অর্ডার করুন' : 'Order'}</span>
                          <ArrowRight className="w-3 h-3 sm:hidden" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── SEARCH + FILTERS ── */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={bn ? 'রোগীর নাম বা জেলা খুঁজুন...' : 'Search by name or district...'}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A] transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                activeFilter === f.id
                  ? 'bg-[#1A6B8A] text-white border-[#1A6B8A]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {f.label}
              {f.id === 'critical' && criticalPts > 0 && (
                <span className={`ml-1.5 px-1 rounded text-[10px] font-black ${activeFilter === f.id ? 'bg-white/20' : 'bg-red-100 text-red-600'}`}>{criticalPts}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── PATIENT LIST ── */}
        <div className="lg:col-span-2 space-y-2">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">
                {bn ? 'কোনো রোগী পাওয়া যায়নি' : 'No patients match your criteria'}
              </p>
            </div>
          ) : (
            filtered.map((patient, i) => {
              const risk = getRiskConfig(patient.risk_score || 0);
              const borderColor = RISK_BORDER[risk.label] || '#1A6B8A';
              const initials = (patient.name || '?')
                .split(' ').slice(0, 2).map((n: string) => n[0].toUpperCase()).join('');
              const gfr = patient.latest_gfr ? Math.round(patient.latest_gfr) : null;
              const score = patient.risk_score || 0;
              const trend = score > 75 ? 'down' : score <= 25 ? 'up' : 'stable';
              const loggedAgo = timeAgo(patient.last_vitals_date, bn);
              const overdue = daysSince(patient.last_vitals_date) >= 7;
              return (
                <motion.button
                  key={patient.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectPatient(patient.id)}
                  className="w-full text-left bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 group transition-all hover:shadow-md active:scale-[0.98]"
                >
                  {/* Avatar with colored risk-border ring */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-slate-700 bg-slate-50 text-sm shrink-0 border-2"
                    style={{ borderColor }}
                  >
                    {initials}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Name + risk badge */}
                    <div className="flex items-start justify-between mb-1 gap-2">
                      <h3 className="font-semibold text-slate-900 text-sm truncate group-hover:text-[#1A6B8A] transition-colors">
                        {patient.name}
                        {(patient.age || patient.sex) && (
                          <span className="font-normal text-slate-500">
                            {', '}{patient.age}{patient.sex}
                          </span>
                        )}
                      </h3>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide shrink-0"
                        style={{
                          backgroundColor: risk.label === 'Critical' ? '#FDECEA'
                            : risk.label === 'High' ? '#FEF5E7'
                            : risk.label === 'Low' ? '#EAFAF1'
                            : '#FEF5E7',
                          color: borderColor,
                        }}
                      >
                        {risk.label}
                      </span>
                    </div>

                    {/* Row 2: eGFR + trend arrow + logged time */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className="text-slate-400 text-xs">eGFR</span>
                        <span className="text-sm font-bold">{gfr ?? '--'}</span>
                        {trend === 'down' && <span className="text-red-500 text-base leading-none">↓</span>}
                        {trend === 'up'   && <span className="text-base leading-none" style={{ color: '#2ECC71' }}>↑</span>}
                        {trend === 'stable' && <span className="text-slate-400 text-base leading-none">–</span>}
                      </div>
                      <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${overdue ? 'bg-red-400' : 'bg-slate-300'}`} />
                        {bn ? 'লগড ' : 'Logged '}{loggedAgo}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#1A6B8A] transition-colors shrink-0" />
                </motion.button>
              );
            })
          )}
        </div>

        {/* ── ALERTS SIDEBAR (desktop) ── */}
        <div className="hidden lg:block">
          <AlertsPanel
            alerts={alerts}
            loading={isLoading}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onSelectPatient={onSelectPatient}
            language={language}
          />
        </div>
      </div>

      {/* ── ASSIGN PATIENT MODAL ── */}
      <AnimatePresence>
        {showAssign && (
          <AssignPatientModal
            token={token!}
            language={language}
            onClose={() => setShowAssign(false)}
            onAssigned={() => { setShowAssign(false); fetchData(); }}
          />
        )}
      </AnimatePresence>

      {/* ── ALERTS DRAWER (mobile) ── */}
      <AnimatePresence>
        {showAlerts && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-[60] lg:hidden"
              onClick={() => setShowAlerts(false)}
            />
            <motion.div
              key="drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-[#F4F7FB] rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto pb-8 lg:hidden"
            >
              <div className="sticky top-0 bg-[#F4F7FB] pt-4 px-4 pb-2 flex items-center justify-between">
                <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-black text-slate-900 mt-2">
                  {bn ? 'সতর্কতা' : 'Alerts'}
                  {unread.length > 0 && <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">{unread.length}</span>}
                </h3>
                <button onClick={() => setShowAlerts(false)} className="p-1.5 text-slate-400 mt-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-4">
                <AlertsPanel
                  alerts={alerts}
                  loading={isLoading}
                  onMarkRead={markRead}
                  onMarkAllRead={markAllRead}
                  onSelectPatient={(id) => { setShowAlerts(false); onSelectPatient(id); }}
                  language={language}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AlertsPanel({ alerts, loading, onMarkRead, onMarkAllRead, onSelectPatient, language }: {
  alerts: any[];
  loading: boolean;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onSelectPatient: (id: number) => void;
  language: string;
}) {
  const bn = language === 'bn';
  const unread = alerts.filter(a => !a.is_read);
  const critical = alerts.filter(a => !a.is_read && a.type === 'CRITICAL');
  const warnings = alerts.filter(a => !a.is_read && a.type !== 'CRITICAL');
  const read = alerts.filter(a => a.is_read).slice(0, 3);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#1A6B8A]" />
          <span className="font-black text-slate-900 text-sm">
            {bn ? 'সতর্কতা' : 'Alerts'}
          </span>
          {unread.length > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button onClick={onMarkAllRead} className="text-[11px] font-bold text-[#1A6B8A] hover:underline">
            {bn ? 'সব পড়ুন' : 'Mark all read'}
          </button>
        )}
      </div>

      <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
        {loading && (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </>
        )}

        {!loading && unread.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">{bn ? 'কোনো নতুন সতর্কতা নেই' : 'No new alerts'}</p>
          </div>
        )}

        {critical.length > 0 && (
          <div>
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5 px-1">
              {bn ? 'সংকটাপন্ন' : 'Critical'}
            </p>
            {critical.map(alert => (
              <AlertCard key={alert.id} alert={alert} onMarkRead={onMarkRead} onSelectPatient={onSelectPatient} language={language} />
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 px-1 mt-2" style={{ color: '#F39C12' }}>
              {bn ? 'সতর্কতা' : 'Warning'}
            </p>
            {warnings.map(alert => (
              <AlertCard key={alert.id} alert={alert} onMarkRead={onMarkRead} onSelectPatient={onSelectPatient} language={language} />
            ))}
          </div>
        )}

        {read.length > 0 && (
          <div className="opacity-50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 mt-2">
              {bn ? 'পঠিত' : 'Read'}
            </p>
            {read.map(alert => (
              <AlertCard key={alert.id} alert={alert} onMarkRead={onMarkRead} onSelectPatient={onSelectPatient} language={language} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ASSIGN PATIENT MODAL ─────────────────────────────────────────────────────
function AssignPatientModal({ token, language, onClose, onAssigned }: {
  token: string;
  language: string;
  onClose: () => void;
  onAssigned: () => void;
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
    debounce.current = setTimeout(() => search(query), 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  const search = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/doctor/unassigned-patients?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(await res.json());
    } finally {
      setLoading(false);
    }
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
    } finally {
      setAssigning(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="assign-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-[80]"
        onClick={onClose}
      />
      {/* Modal */}
      <motion.div
        key="assign-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-[90] bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" style={{ color: '#2ECC71' }} />
            <h2 className="font-black text-slate-900">
              {bn ? 'রোগী খুঁজুন ও যুক্ত করুন' : 'Find & Assign Patient'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={bn ? 'নাম বা জেলা দিয়ে খুঁজুন...' : 'Search by name or district...'}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 px-1">
            {bn ? 'শুধুমাত্র আপনার প্যানেলে নেই এমন রোগী দেখানো হচ্ছে' : 'Showing patients not yet in your panel'}
          </p>
        </div>

        {/* Results */}
        <div className="overflow-y-auto px-5 pb-5 space-y-2" style={{ maxHeight: '50vh' }}>
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#1A6B8A]" />
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {bn ? 'কোনো রোগী পাওয়া যায়নি' : 'No unassigned patients found'}
              </p>
            </div>
          )}

          {!loading && results.map(patient => {
            const isAssigning = assigning === patient.id;
            const wasAssigned = assigned.has(patient.id);
            const risk = getRiskConfig(patient.risk_score || 0);
            return (
              <div
                key={patient.id}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[#1A6B8A] text-white flex items-center justify-center font-black text-sm shrink-0">
                  {patient.name?.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{patient.name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {patient.district}{patient.age ? ` · ${patient.age}y` : ''}{patient.sex ? ` · ${patient.sex}` : ''}
                  </p>
                </div>

                {/* Risk badge */}
                <span
                  className="hidden sm:inline px-2 py-1 rounded-full text-xs font-black border shrink-0"
                  style={{ background: risk.bg, color: risk.color, borderColor: risk.borderColor }}
                >
                  {risk.label}
                </span>

                {/* Stage */}
                <span className="hidden sm:inline text-xs font-bold text-slate-500 shrink-0">
                  {patient.ckd_stage ? `S${patient.ckd_stage}` : '--'}
                </span>

                {/* Assign button */}
                <button
                  onClick={() => assign(patient.id)}
                  disabled={isAssigning || wasAssigned}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[36px] shrink-0 disabled:opacity-70"
                  style={wasAssigned
                    ? { background: '#EAFAF1', color: '#1a7a44', border: '1px solid #2ECC71' }
                    : { background: '#2ECC71', color: '#fff' }
                  }
                >
                  {isAssigning
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : wasAssigned
                      ? <CheckCircle2 className="w-3.5 h-3.5" />
                      : <UserPlus className="w-3.5 h-3.5" />
                  }
                  {wasAssigned
                    ? (bn ? 'যুক্ত হয়েছে' : 'Assigned')
                    : (bn ? 'যুক্ত করুন' : 'Assign')
                  }
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}

function AlertCard({ alert, onMarkRead, onSelectPatient, language }: {
  alert: any;
  onMarkRead: (id: number) => void;
  onSelectPatient: (id: number) => void;
  language: string;
}) {
  const isCritical = alert.type === 'CRITICAL';
  return (
    <div
      className={`relative rounded-xl p-3 mb-1.5 group ${alert.is_read ? 'opacity-60' : ''}`}
      style={{
        background: isCritical ? '#FDECEA' : '#FEF5E7',
        border: `1px solid ${isCritical ? '#E74C3C' : '#F39C12'}`,
      }}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: isCritical ? '#E74C3C' : '#F39C12' }} />
        <div className="flex-1 min-w-0">
          <button
            className="font-bold text-xs text-slate-900 hover:text-[#1A6B8A] transition-colors text-left leading-snug"
            onClick={() => alert.patient_id && onSelectPatient(alert.patient_id)}
          >
            {alert.patient_name}
          </button>
          <p className="text-[11px] text-slate-600 leading-snug mt-0.5 line-clamp-2">{alert.message}</p>
          <p className="text-[10px] text-slate-400 mt-1">
            {new Date(alert.triggered_at).toLocaleDateString()}
          </p>
        </div>
        {!alert.is_read && (
          <button
            onClick={() => onMarkRead(alert.id)}
            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-[#1A6B8A] shrink-0"
            title="Mark as read"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
