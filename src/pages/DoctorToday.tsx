import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Clock, AlertTriangle, Video, ChevronRight,
  CheckCircle2, Loader2, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function daysSince(dateStr: string | null) {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n.charAt(0).toUpperCase())
    .join('');
}

function getTodayGreeting(name: string, bn: boolean) {
  const h = new Date().getHours();
  const firstName = name.split(' ')[0];
  if (bn) {
    if (h < 12) return `সুপ্রভাত, ডা. ${firstName}`;
    if (h < 17) return `শুভ বিকেল, ডা. ${firstName}`;
    return `শুভ সন্ধ্যা, ডা. ${firstName}`;
  }
  if (h < 12) return `Good morning, Dr. ${firstName}`;
  if (h < 17) return `Good afternoon, Dr. ${firstName}`;
  return `Good evening, Dr. ${firstName}`;
}

function formatDateLine(bn: boolean) {
  return new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).toUpperCase();
}

// Derive a CKD stage label + color from risk score
function getCKDInfo(riskScore: number, bn: boolean) {
  if (riskScore > 75) return {
    label: bn ? 'সিকেডি স্টেজ ৫' : 'CKD Stage 5',
    cls: 'text-red-600 bg-red-50',
    avatarCls: 'bg-red-100 text-red-700',
  };
  if (riskScore > 50) return {
    label: bn ? 'সিকেডি স্টেজ ৪' : 'CKD Stage 4',
    cls: 'text-rose-600 bg-rose-50',
    avatarCls: 'bg-rose-100 text-rose-700',
  };
  if (riskScore > 30) return {
    label: bn ? 'সিকেডি স্টেজ ৩' : 'CKD Stage 3',
    cls: 'text-[#F39C12] bg-[#FEF5E7]',
    avatarCls: 'bg-[#FEF5E7] text-[#7d5100]',
  };
  return {
    label: bn ? 'সিকেডি স্টেজ ২' : 'CKD Stage 2',
    cls: 'text-[#1A6B8A] bg-[#EFF8FB]',
    avatarCls: 'bg-[#EFF8FB] text-[#1A6B8A]',
  };
}

// Assign a fake "scheduled time" slot to follow-up patients for display
const FOLLOW_UP_TIMES = ['9:00 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '2:00 PM', '2:30 PM', '3:00 PM'];

function WeekCalendar({ bn }: { bn: boolean }) {
  const today = new Date();
  const todayDow = today.getDay();
  // Show Sun–Sat of current week
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - todayDow + i);
    return d;
  });
  const dayLabels = bn
    ? ['র', 'সো', 'ম', 'বু', 'বৃ', 'শু', 'শ']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
      {weekDates.map((d, i) => {
        const isToday = d.toDateString() === today.toDateString();
        return (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">{dayLabels[i]}</span>
            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-all ${
              isToday
                ? 'bg-[#1A6B8A] text-white shadow-md shadow-[#1A6B8A]/30'
                : 'text-slate-600 hover:bg-slate-50'
            }`}>
              {d.getDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DoctorToday({ onSelectPatient }: { onSelectPatient: (patient: { id: number; name?: string }) => void }) {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const bn = language === 'bn';
  const doctorName = user?.name || 'Doctor';

  useEffect(() => {
    setLoading(true);
    fetch('/api/doctor/patients', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(p => {
        setPatients(Array.isArray(p) ? p : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const overdue = patients.filter(p => daysSince(p.last_vitals_date) >= 7);
  // Top follow-up patients: high risk, sorted by score descending
  const followUps = [...patients]
    .filter(p => p.risk_score > 25)
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 4);
  // Teleconsult: top 1 critical patient
  const teleconsultPatient = patients.find(p => p.risk_score > 75) || null;

  const allClear = !loading && overdue.length === 0 && followUps.length === 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-medium">
          {bn ? 'লোড হচ্ছে...' : "Loading today's briefing..."}
        </p>
      </div>
    );
  }

  return (
    <div className="pb-6">

      {/* ── FULL-BLEED TEAL HEADER ── */}
      <div
        className="-mx-4 sm:-mx-6 lg:-mx-8 px-5 pt-6 pb-7 mb-5 text-white"
        style={{
          background: 'linear-gradient(135deg, #1A6B8A 0%, #0e4d66 100%)',
          borderRadius: '0 0 2rem 2rem',
        }}
      >
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">
            {formatDateLine(bn)}
          </p>
          <h1 className="text-2xl font-black mb-5 leading-tight">
            {getTodayGreeting(doctorName, bn)}
          </h1>

          {/* Stat chips — horizontally scrollable, glass-morphism */}
          <div
            className="flex gap-3 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {[
              {
                value: followUps.length,
                label: bn ? 'ফলো-আপ' : 'Follow-ups',
                urgent: false,
              },
              {
                value: 1,
                label: bn ? 'টেলিকনসালট' : 'Teleconsults',
                urgent: false,
              },
              {
                value: overdue.length,
                label: bn ? 'বাকি' : 'Overdue',
                urgent: overdue.length > 0,
              },
            ].map(({ value, label, urgent }) => (
              <div
                key={label}
                className="shrink-0 rounded-xl px-4 py-3 flex flex-col min-w-[100px] border"
                style={{
                  backgroundColor: urgent ? 'rgba(239,68,68,0.75)' : 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)',
                  borderColor: urgent ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
                }}
              >
                <span className="text-2xl font-black leading-none mb-0.5">{value}</span>
                <span className="text-xs font-medium opacity-90">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── WEEK CALENDAR ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6"
      >
        <WeekCalendar bn={bn} />
      </motion.div>

      {/* ── ALL CLEAR ── */}
      {allClear && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-6 text-center mb-6"
          style={{ background: '#EAFAF1', border: '1px solid #2ECC71' }}
        >
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Sparkles className="w-6 h-6" style={{ color: '#2ECC71' }} />
          </div>
          <p className="font-black text-lg" style={{ color: '#1a7a44' }}>
            {bn ? 'সব ঠিক আছে!' : 'All caught up!'}
          </p>
          <p className="text-sm mt-1 font-medium" style={{ color: '#1a7a44' }}>
            {bn ? 'আপনি সব দেখেছেন।' : 'আপনি সব দেখেছেন। Great job managing your patients today.'}
          </p>
        </motion.div>
      )}

      {/* ── SCHEDULED FOLLOW-UPS ── */}
      {followUps.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg" aria-hidden>📋</span>
            <h2 className="font-bold text-slate-800">
              {bn ? 'নির্ধারিত ফলো-আপ' : 'Scheduled Follow-ups'}
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {followUps.map((p, i) => {
              const ckd = getCKDInfo(p.risk_score || 0, bn);
              const time = FOLLOW_UP_TIMES[i % FOLLOW_UP_TIMES.length];
              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => onSelectPatient({ id: p.id, name: p.name })}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between w-full text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${ckd.avatarCls}`}>
                      {getInitials(p.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <span className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${ckd.cls}`}>
                          {ckd.label}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          {time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                    <span className="text-[10px] text-slate-400 font-medium">
                      {bn ? 'খুলুন' : 'Tap to open'}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ── UPCOMING TELECONSULTS ── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg" aria-hidden>📹</span>
          <h2 className="font-bold text-slate-800">
            {bn ? 'আসন্ন টেলিকনসালট' : 'Upcoming Teleconsults'}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          {teleconsultPatient ? (
            <>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: '#EFF8FB', color: '#1A6B8A' }}>
                      {getInitials(teleconsultPatient.name)}
                    </div>
                    {/* Online dot */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2ECC71' }} />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{teleconsultPatient.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {bn ? 'রুটিন চেকআপ' : 'Routine Checkup'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 text-xs font-semibold text-slate-700 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  2:30 PM
                </div>
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', {
                  detail: {
                    page: 'teleconsult',
                    teleconsultPatient: { id: teleconsultPatient.id, name: teleconsultPatient.name },
                    selectedPatient: { id: teleconsultPatient.id, name: teleconsultPatient.name },
                  },
                }))}
                className="w-full py-2.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:opacity-80"
                style={{ backgroundColor: '#1A6B8A' }}
              >
                <Video className="w-4 h-4" />
                {bn ? 'কল যোগ দিন' : 'Join Call'}
              </button>
            </>
          ) : (
            <div className="text-center py-4 text-slate-400">
              <Video className="w-8 h-8 mx-auto mb-2 opacity-25" />
              <p className="text-sm font-medium">
                {bn ? 'আজ কোনো টেলিকনসালট নেই' : 'No teleconsults scheduled today'}
              </p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'teleconsult' }))}
                className="mt-3 text-xs font-bold text-[#1A6B8A] hover:underline"
              >
                {bn ? 'একটি শুরু করুন →' : 'Start one →'}
              </button>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── OVERDUE — No vitals >7 days ── */}
      <AnimatePresence>
        {overdue.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg" aria-hidden>⏰</span>
              <h2 className="font-bold text-slate-800">
                {bn ? 'বাকি — ভাইটালস নেই >৭ দিন' : 'Overdue — No vitals >7 days'}
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {overdue.slice(0, 5).map((p, i) => {
                const d = daysSince(p.last_vitals_date);
                const lastDate = p.last_vitals_date
                  ? new Date(p.last_vitals_date).toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short' })
                  : (bn ? 'কখনো নয়' : 'Never');
                return (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.04 }}
                    onClick={() => onSelectPatient({ id: p.id, name: p.name })}
                    className="bg-rose-50/60 rounded-2xl p-4 shadow-sm border border-rose-100 flex items-center justify-between w-full text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white text-slate-700 flex items-center justify-center font-bold text-sm border border-rose-100 shrink-0">
                        {getInitials(p.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {bn ? 'শেষ লগ: ' : 'Last log: '}{lastDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs font-semibold text-rose-600 bg-rose-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {d === 999 ? (bn ? 'কখনো নয়' : 'Never') : `${d}d`}
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </div>
                  </motion.button>
                );
              })}
              {overdue.length > 5 && (
                <p className="text-center text-xs text-slate-400 font-medium pt-1">
                  {bn ? `+ আরও ${overdue.length - 5} জন` : `+ ${overdue.length - 5} more`}
                </p>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── ALWAYS-SHOWN BOTTOM "ALL CAUGHT UP" FOOTER ── */}
      {!allClear && (
        <div className="mt-4 mb-2 text-center flex flex-col items-center gap-2 opacity-60">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#EAFAF1' }}>
            <CheckCircle2 className="w-5 h-5" style={{ color: '#2ECC71' }} />
          </div>
          <p className="text-sm font-medium text-slate-500">
            {bn ? 'আপনি সব দেখেছেন' : 'All caught up! আপনি সব দেখেছেন'}
          </p>
          <p className="text-xs text-slate-400">
            {bn ? 'আজকের সব কাজ সম্পন্ন।' : 'Great job managing your patients today.'}
          </p>
        </div>
      )}

    </div>
  );
}
