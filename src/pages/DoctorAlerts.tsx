import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, Bell, Loader2
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';

type FilterType = 'ALL' | 'CRITICAL' | 'WARNING';

function timeAgo(dateStr: string, bn: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days >= 1) return bn ? `${days} দিন আগে` : days === 1 ? 'Yesterday' : `${days}d ago`;
  if (hrs >= 1) return bn ? `${hrs}ঘ আগে` : `${hrs}h ago`;
  if (mins >= 1) return bn ? `${mins}মি আগে` : `${mins}m ago`;
  return bn ? 'এইমাত্র' : 'Just now';
}

interface Alert {
  id: number;
  type: string;
  patient_name: string;
  patient_id?: number;
  message: string;
  triggered_at: string;
  is_read: boolean;
}

function SwipeableAlertCard({
  alert,
  onMarkRead,
  onViewPatient,
  bn,
}: {
  alert: Alert;
  onMarkRead: (id: number) => void;
  onViewPatient: (patient: { id: number; name?: string }) => void;
  bn: boolean;
}) {
  const isCritical = alert.type === 'CRITICAL';
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-80, 0], [0, 1]);
  const dismissOpacity = useTransform(x, [-80, -40, 0], [1, 0.6, 0]);

  const borderColor = isCritical ? '#E74C3C' : '#F39C12';
  const iconBg = isCritical ? '#fceeea' : '#fef5e7';
  const IconComp = isCritical ? AlertCircle : AlertTriangle;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe-to-dismiss background */}
      <motion.div
        style={{ backgroundColor: '#fee2e2', opacity: dismissOpacity } as any}
        className="absolute inset-0 flex items-center justify-end pr-5 rounded-xl"
      >
        <CheckCircle2 className="w-5 h-5 text-red-400" />
      </motion.div>

      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -90, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) onMarkRead(alert.id);
        }}
        className="relative bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {/* Left accent border */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: borderColor }}
        />
        <div className="p-4 pl-5">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md shrink-0" style={{ backgroundColor: iconBg }}>
                <IconComp size={16} style={{ color: borderColor }} />
              </div>
              <span className="font-bold text-slate-800 text-sm leading-tight">
                {alert.patient_name}
              </span>
              {!alert.is_read && (
                <span className="w-2 h-2 rounded-full bg-[#1A6B8A] shrink-0" />
              )}
            </div>
            <span className="text-[10px] font-medium text-slate-400 shrink-0 ml-2">
              {timeAgo(alert.triggered_at, bn)}
            </span>
          </div>

          <p className="text-slate-700 text-sm font-medium leading-snug mb-3 pl-0.5">
            {alert.message}
          </p>

          <div className="flex items-center gap-4">
            {alert.patient_id && (
              <button
                onClick={() => onViewPatient({ id: alert.patient_id!, name: alert.patient_name })}
                className="text-xs font-bold flex items-center gap-1 group hover:underline transition-all"
                style={{ color: '#1A6B8A' }}
              >
                {bn ? 'রোগী দেখুন' : 'View Patient'}
                <ChevronRight
                  size={14}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </button>
            )}
            {!alert.is_read && (
              <button
                onClick={() => onMarkRead(alert.id)}
                className="ml-auto text-[10px] font-semibold text-slate-400 hover:text-[#1A6B8A] transition-colors"
              >
                {bn ? '✓ পড়েছি' : '✓ Mark read'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 pl-5 animate-pulse overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200" />
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-md bg-slate-100" />
        <div className="h-3.5 w-28 bg-slate-100 rounded" />
      </div>
      <div className="h-3 w-48 bg-slate-100 rounded mb-2" />
      <div className="h-3 w-20 bg-slate-100 rounded" />
    </div>
  );
}

export default function DoctorAlerts() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [markingAll, setMarkingAll] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  const bn = language === 'bn';

  useEffect(() => { fetchAlerts(); }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/doctor/alerts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (alertId?: number) => {
    if (!alertId) setMarkingAll(true);
    try {
      await fetch('/api/doctor/alerts/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ alertId }),
      });
      setAlerts(prev =>
        alertId
          ? prev.map(a => a.id === alertId ? { ...a, is_read: true } : a)
          : prev.map(a => ({ ...a, is_read: true }))
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const viewPatient = (patient: { id: number; name?: string }) => {
    window.dispatchEvent(new CustomEvent('navigate', {
      detail: {
        page: `patient-${patient.id}`,
        selectedPatient: patient,
      },
    }));
  };

  const critical = alerts.filter(a => a.type === 'CRITICAL');
  const warnings = alerts.filter(a => a.type !== 'CRITICAL');
  const unread = alerts.filter(a => !a.is_read);

  const displayedCritical = critical.filter(() => filter === 'ALL' || filter === 'CRITICAL');
  const displayedWarnings = warnings.filter(() => filter === 'ALL' || filter === 'WARNING');

  const filterTabs: { id: FilterType; label: string; labelBn: string }[] = [
    { id: 'ALL', label: 'All', labelBn: 'সব' },
    { id: 'CRITICAL', label: 'Critical', labelBn: 'সংকটাপন্ন' },
    { id: 'WARNING', label: 'Warning', labelBn: 'সতর্কতা' },
  ];

  const isEmpty = !loading && displayedCritical.length === 0 && displayedWarnings.length === 0;

  return (
    <div className="max-w-2xl mx-auto -mx-0">

      {/* ── STICKY HEADER ── */}
      <div
        ref={headerRef}
        className="sticky top-16 z-40 bg-white border-b border-slate-200 shadow-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-2xl mx-auto pt-5 pb-0">

          {/* Title row */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-black text-slate-800">
              {bn ? 'ক্লিনিকাল সতর্কতা' : 'Clinical Alerts'}
            </h1>
            {unread.length > 0 && (
              <button
                onClick={() => markRead()}
                disabled={markingAll}
                className="text-sm font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ color: '#1A6B8A' }}
              >
                {markingAll
                  ? <Loader2 size={15} className="animate-spin" />
                  : <CheckCircle2 size={15} />}
                {bn ? 'সব পড়েছি' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Summary chips */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <div className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold whitespace-nowrap shrink-0">
              {bn ? `মোট ${alerts.length}` : `Total ${alerts.length}`}
            </div>
            <div
              className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1"
              style={{ backgroundColor: '#fceeea', color: '#E74C3C' }}
            >
              <AlertCircle size={12} />
              {bn ? `সংকটাপন্ন ${critical.length}` : `Critical ${critical.length}`}
            </div>
            <div
              className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1"
              style={{ backgroundColor: '#fef5e7', color: '#F39C12' }}
            >
              <AlertTriangle size={12} />
              {bn ? `সতর্কতা ${warnings.length}` : `Warning ${warnings.length}`}
            </div>
            {unread.length > 0 && (
              <div className="px-3 py-1.5 rounded-full bg-[#1A6B8A]/10 text-[#1A6B8A] text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1">
                <Bell size={12} />
                {bn ? `অপঠিত ${unread.length}` : `Unread ${unread.length}`}
              </div>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-slate-200">
            {filterTabs.map(tab => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`flex-1 pb-2.5 text-sm font-semibold transition-colors relative ${
                    active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {bn ? tab.labelBn : tab.label}
                  {active && (
                    <motion.div
                      layoutId="alertFilterUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                      style={{ backgroundColor: '#1A6B8A' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="space-y-6 pt-5">

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : isEmpty ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-slate-400"
          >
            <Bell className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-semibold">
              {bn ? 'কোনো সতর্কতা নেই' : 'No alerts'}
            </p>
            <p className="text-xs mt-1 opacity-70">
              {bn ? 'সব ক্লিয়ার — ভালো কাজ!' : "All clear — great work!"}
            </p>
          </motion.div>
        ) : (
          <>
            {/* CRITICAL SECTION */}
            <AnimatePresence>
              {displayedCritical.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#E74C3C' }} />
                    <h2
                      className="text-xs font-black tracking-wider uppercase"
                      style={{ color: '#E74C3C' }}
                    >
                      {bn ? 'জরুরি ব্যবস্থা প্রয়োজন' : 'Critical Actions Required'}
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {displayedCritical.map((alert, i) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: alert.is_read ? 0.55 : 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <SwipeableAlertCard
                          alert={alert}
                          onMarkRead={markRead}
                          onViewPatient={viewPatient}
                          bn={bn}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* WARNING SECTION */}
            <AnimatePresence>
              {displayedWarnings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#F39C12' }} />
                    <h2
                      className="text-xs font-black tracking-wider uppercase"
                      style={{ color: '#F39C12' }}
                    >
                      {bn ? 'সতর্কতা' : 'Warnings'}
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {displayedWarnings.map((alert, i) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: alert.is_read ? 0.55 : 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <SwipeableAlertCard
                          alert={alert}
                          onMarkRead={markRead}
                          onViewPatient={viewPatient}
                          bn={bn}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Swipe hint */}
        {!loading && !isEmpty && (
          <p className="text-center text-xs text-slate-400 font-medium pb-4">
            {bn ? '← সোয়াইপ করে পড়েছি চিহ্নিত করুন' : '← Swipe card left to dismiss'}
          </p>
        )}
      </div>
    </div>
  );
}
