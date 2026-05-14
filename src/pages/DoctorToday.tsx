import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Clock, AlertCircle, CalendarCheck, Video,
  ChevronRight, CheckCircle2, Loader2, Users
} from 'lucide-react';
import { motion } from 'motion/react';

function daysSince(dateStr: string | null) {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function getTodayGreeting(name: string, bn: boolean) {
  const h = new Date().getHours();
  if (bn) {
    if (h < 12) return `সুপ্রভাত, ডা. ${name}`;
    if (h < 17) return `শুভ বিকেল, ডা. ${name}`;
    return `শুভ সন্ধ্যা, ডা. ${name}`;
  }
  if (h < 12) return `Good morning, Dr. ${name}`;
  if (h < 17) return `Good afternoon, Dr. ${name}`;
  return `Good evening, Dr. ${name}`;
}

function formatDate(bn: boolean) {
  return new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function WeekStrip({ bn }: { bn: boolean }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 3 + i);
    return d;
  });
  const dayLabels = bn
    ? ['রবি', 'সোম', 'মঙ্গ', 'বুধ', 'বৃহ', 'শুক্র', 'শনি']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
      {days.map((d, i) => {
        const isToday = d.toDateString() === today.toDateString();
        return (
          <div
            key={i}
            className={`flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl min-w-[44px] transition-all ${
              isToday ? 'bg-[#1A6B8A] text-white shadow-md shadow-[#1A6B8A]/20' : 'bg-white text-slate-500'
            }`}
          >
            <span className="text-[10px] font-bold uppercase">{dayLabels[d.getDay()]}</span>
            <span className="text-sm font-black">{d.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function DoctorToday({ onSelectPatient }: { onSelectPatient: (id: number) => void }) {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const [patients, setPatients] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const bn = language === 'bn';
  const doctorFirstName = user?.name?.split(' ')[0] || 'Doctor';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/doctor/patients', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/doctor/alerts', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([p, a]) => {
      setPatients(Array.isArray(p) ? p : []);
      setAlerts(Array.isArray(a) ? a : []);
      setLoading(false);
    });
  }, []);

  const overdue = patients.filter(p => daysSince(p.last_vitals_date) >= 7);
  const critical = patients.filter(p => p.risk_score > 75);
  const unreadAlerts = alerts.filter(a => !a.is_read);
  const criticalAlerts = alerts.filter(a => a.type === 'CRITICAL' && !a.is_read);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-medium">{bn ? 'লোড হচ্ছে...' : "Loading today's briefing..."}</p>
      </div>
    );
  }

  const allClear = overdue.length === 0 && criticalAlerts.length === 0;

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#1A6B8A] to-[#0e4d66] rounded-2xl p-5 text-white shadow-lg shadow-[#1A6B8A]/20"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70 mb-1">{formatDate(bn)}</p>
        <h1 className="text-xl font-black leading-tight mb-3">{getTodayGreeting(doctorFirstName, bn)}</h1>
        <WeekStrip bn={bn} />
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            value: overdue.length,
            label: bn ? 'মিসড লগ' : 'Overdue',
            color: overdue.length > 0 ? 'text-red-600' : 'text-emerald-600',
            bg: overdue.length > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100',
            Icon: Clock,
          },
          {
            value: unreadAlerts.length,
            label: bn ? 'নতুন অ্যালার্ট' : 'Unread Alerts',
            color: unreadAlerts.length > 0 ? 'text-amber-600' : 'text-emerald-600',
            bg: unreadAlerts.length > 0 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100',
            Icon: AlertCircle,
          },
          {
            value: critical.length,
            label: bn ? 'ক্রিটিক্যাল' : 'Critical Pts',
            color: critical.length > 0 ? 'text-red-600' : 'text-emerald-600',
            bg: critical.length > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100',
            Icon: Users,
          },
        ].map(({ value, label, color, bg, Icon }) => (
          <div key={label} className={`rounded-2xl border p-3 text-center ${bg}`}>
            <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className={`text-[10px] font-bold leading-tight ${color} opacity-80`}>{label}</p>
          </div>
        ))}
      </div>

      {/* All clear state */}
      {allClear && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center"
        >
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className="font-black text-emerald-700 text-lg">
            {bn ? 'সব ঠিক আছে!' : 'All caught up!'}
          </p>
          <p className="text-sm text-emerald-600 mt-1">
            {bn ? 'আজ কোনো জরুরি বিষয় নেই। আপনি সব দেখেছেন।' : 'No urgent tasks today. You\'re all set.'}
          </p>
        </motion.div>
      )}

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-100">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <h2 className="font-black text-red-700 text-sm uppercase tracking-wide">
              {bn ? 'জরুরি অ্যালার্ট' : 'Critical Alerts'}
            </h2>
            <span className="ml-auto bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {criticalAlerts.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {criticalAlerts.slice(0, 3).map((alert, i) => (
              <motion.button
                key={alert.id || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => alert.patient_id && onSelectPatient(alert.patient_id)}
                className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left border-l-4 border-l-red-500"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{alert.patient_name || (bn ? 'রোগী' : 'Patient')}</p>
                  <p className="text-xs text-red-600 font-semibold mt-0.5 leading-snug">{alert.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Patients */}
      {overdue.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="font-black text-amber-700 text-sm uppercase tracking-wide">
              {bn ? 'মিসড ভাইটালস (>৭ দিন)' : 'No Vitals >7 Days'}
            </h2>
            <span className="ml-auto bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {overdue.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {overdue.slice(0, 5).map((p, i) => {
              const d = daysSince(p.last_vitals_date);
              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onSelectPatient(p.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left border-l-4 border-l-amber-400"
                >
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-sm shrink-0">
                    {p.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-400">{p.district}</p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[11px] font-black">
                    {d === 999 ? (bn ? 'কখনো নয়' : 'Never') : `${d}d ${bn ? 'আগে' : 'ago'}`}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </motion.button>
              );
            })}
          </div>
          {overdue.length > 5 && (
            <div className="px-4 py-3 border-t border-slate-50 text-center">
              <p className="text-xs text-slate-400 font-medium">
                {bn ? `আরও ${overdue.length - 5} জন রোগী আছে` : `+${overdue.length - 5} more patients`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Follow-ups prompt */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarCheck className="w-4 h-4 text-[#1A6B8A]" />
          <h2 className="font-black text-slate-800 text-sm">
            {bn ? 'পেশেন্ট ফলো-আপ' : 'Patient Follow-ups'}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'doctor-dashboard' }))}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1A6B8A] text-white rounded-xl text-sm font-bold hover:bg-[#14556e] transition-all min-h-[48px]"
          >
            <Users className="w-4 h-4" />
            {bn ? 'রোগীর তালিকা' : 'Patient List'}
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'teleconsult' }))}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all min-h-[48px]"
          >
            <Video className="w-4 h-4" />
            {bn ? 'টেলিকনসালট' : 'Teleconsult'}
          </button>
        </div>
      </div>
    </div>
  );
}
