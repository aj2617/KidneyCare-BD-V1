import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Users, Search, Bell, ChevronRight, AlertCircle,
  Activity, Clock, Filter, X, UserPlus, CheckCircle2, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  if (score <= 25) return { label: 'Low', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
  if (score <= 50) return { label: 'Moderate', cls: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
  if (score <= 75) return { label: 'High', cls: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' };
  return { label: 'Critical', cls: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' };
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function DoctorDashboard({ onSelectPatient }: { onSelectPatient: (id: number) => void }) {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [patients, setPatients] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const bn = language === 'bn';

  useEffect(() => { fetchData(); }, [assignedOnly]);

  const fetchData = async () => {
    setIsLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [pRes, aRes] = await Promise.all([
        fetch(`/api/doctor/patients?assignedOnly=${assignedOnly}`, { headers }),
        fetch('/api/doctor/alerts', { headers }),
      ]);
      setPatients(await pRes.json());
      setAlerts(await aRes.json());
    } finally {
      setIsLoading(false);
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

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {bn ? 'ক্লিনিকাল ওয়ার্কস্পেস' : 'Clinical Workspace'}
          </h1>
          <p className="text-sm text-slate-500">
            {bn ? 'আপনার রোগীদের পর্যবেক্ষণ করুন' : 'Monitor and manage your patient panel'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAssignedOnly(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
              assignedOnly
                ? 'bg-[#1A6B8A] text-white border-[#1A6B8A]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#1A6B8A]'
            }`}
          >
            <Users className="w-4 h-4" />
            {assignedOnly ? (bn ? 'আমার রোগী' : 'My Patients') : (bn ? 'সব রোগী' : 'All Patients')}
          </button>
          <button
            onClick={() => setShowAssign(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            {bn ? 'রোগী যুক্ত করুন' : 'Find & Assign'}
          </button>
          <button
            onClick={() => setShowAlerts(v => !v)}
            className="relative p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:border-[#1A6B8A] transition-all"
          >
            <Bell className="w-5 h-5" />
            {unread.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {unread.length > 9 ? '9+' : unread.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: bn ? 'মোট রোগী' : 'Total Patients', value: patients.length, icon: Users, color: 'text-[#1A6B8A] bg-[#1A6B8A]/10' },
          { label: bn ? 'সংকটাপন্ন' : 'Critical', value: criticalPts, icon: AlertCircle, color: 'text-red-600 bg-red-50' },
          { label: bn ? 'অপঠিত সতর্কতা' : 'Unread Alerts', value: unread.length, icon: Bell, color: 'text-amber-600 bg-amber-50' },
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
            filtered.map(patient => {
              const risk = getRiskConfig(patient.risk_score || 0);
              const daysSinceVitals = daysSince(patient.last_vitals_date);
              const isCritical = (patient.risk_score || 0) > 75;
              return (
                <motion.button
                  key={patient.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectPatient(patient.id)}
                  className={`w-full text-left bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-3 group transition-all hover:shadow-md hover:border-[#1A6B8A]/30 ${
                    isCritical ? 'border-red-100' : 'border-slate-100'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`relative w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-base shrink-0 ${
                    isCritical ? 'bg-red-500' : 'bg-[#1A6B8A]'
                  }`}>
                    {patient.name?.charAt(0)}
                    {isCritical && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 border-2 border-white rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm truncate group-hover:text-[#1A6B8A] transition-colors">
                        {patient.name}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {patient.district}{patient.age ? ` · ${patient.age}y` : ''}{patient.sex ? ` · ${patient.sex}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* GFR */}
                    <div className="hidden sm:flex flex-col items-center">
                      <span className="text-xs font-black text-slate-700">
                        {patient.latest_gfr ? Math.round(patient.latest_gfr) : '--'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">GFR</span>
                    </div>

                    {/* Stage */}
                    <div className="hidden sm:flex flex-col items-center px-2">
                      <span className="text-xs font-black text-slate-700">
                        {patient.ckd_stage ? `S${patient.ckd_stage}` : '--'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Stage</span>
                    </div>

                    {/* Vitals age */}
                    {daysSinceVitals < 999 && (
                      <div className={`hidden sm:flex items-center gap-1 text-[10px] font-bold ${
                        daysSinceVitals > 7 ? 'text-red-500' : 'text-slate-400'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {daysSinceVitals}d
                      </div>
                    )}

                    {/* Risk badge */}
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${risk.cls}`}>
                      {risk.label}
                    </span>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#1A6B8A] transition-colors" />
                  </div>
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
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1.5 px-1 mt-2">
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
            <UserPlus className="w-5 h-5 text-emerald-600" />
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
                <span className={`hidden sm:inline px-2 py-1 rounded-full text-[10px] font-black border ${risk.cls} shrink-0`}>
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
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[36px] shrink-0 ${
                    wasAssigned
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                  } disabled:opacity-70`}
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
    <div className={`relative rounded-xl p-3 mb-1.5 group ${
      isCritical ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'
    } ${alert.is_read ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2.5">
        <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isCritical ? 'text-red-500' : 'text-amber-500'}`} />
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
