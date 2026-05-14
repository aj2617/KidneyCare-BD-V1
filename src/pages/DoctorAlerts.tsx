import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Bell, AlertCircle, CheckCircle2, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AlertType = 'ALL' | 'CRITICAL' | 'WARNING';

export default function DoctorAlerts() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AlertType>('ALL');

  const bn = language === 'bn';

  useEffect(() => { fetchAlerts(); }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/doctor/alerts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (alertId?: number) => {
    await fetch('/api/doctor/alerts/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ alertId }),
    });
    fetchAlerts();
  };

  const unread = alerts.filter(a => !a.is_read);
  const critical = alerts.filter(a => a.type === 'CRITICAL');
  const warnings = alerts.filter(a => a.type !== 'CRITICAL');

  const displayed = alerts.filter(a => {
    if (filter === 'CRITICAL') return a.type === 'CRITICAL';
    if (filter === 'WARNING') return a.type !== 'CRITICAL';
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#1A6B8A]" />
            {bn ? 'ক্লিনিকাল সতর্কতা' : 'Clinical Alerts'}
            {unread.length > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-black rounded-full">
                {unread.length}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {bn ? 'সংকটাপন্ন রোগীর ঘটনা পর্যবেক্ষণ করুন' : 'Monitor critical patient events and system notifications'}
          </p>
        </div>
        {unread.length > 0 && (
          <button
            onClick={() => markRead()}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[#1A6B8A] bg-[#1A6B8A]/5 hover:bg-[#1A6B8A]/10 rounded-xl transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            {bn ? 'সব পড়েছি চিহ্নিত করুন' : 'Mark All as Read'}
          </button>
        )}
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: bn ? 'মোট' : 'Total', value: alerts.length, color: 'text-slate-700 bg-slate-50 border-slate-200' },
          { label: bn ? 'সংকটাপন্ন' : 'Critical', value: critical.length, color: 'text-red-700 bg-red-50 border-red-200' },
          { label: bn ? 'সতর্কতা' : 'Warning', value: warnings.length, color: 'text-amber-700 bg-amber-50 border-amber-200' },
        ].map(s => (
          <div key={s.label} className={`flex flex-col items-center py-3 rounded-2xl border font-bold ${s.color}`}>
            <span className="text-2xl">{s.value}</span>
            <span className="text-xs">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { id: 'ALL', label: bn ? 'সব' : 'All' },
          { id: 'CRITICAL', label: bn ? 'সংকটাপন্ন' : 'Critical' },
          { id: 'WARNING', label: bn ? 'সতর্কতা' : 'Warning' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as AlertType)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
              filter === tab.id
                ? 'bg-[#1A6B8A] text-white border-[#1A6B8A]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">
              {bn ? 'কোনো সতর্কতা নেই' : 'No alerts found'}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {displayed.map(alert => {
              const isCritical = alert.type === 'CRITICAL';
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: alert.is_read ? 0.55 : 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`rounded-2xl border p-4 transition-all ${
                    alert.is_read
                      ? 'bg-white border-slate-100'
                      : isCritical
                        ? 'bg-red-50 border-red-200 shadow-sm'
                        : 'bg-amber-50 border-amber-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        isCritical ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                            isCritical ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {alert.type}
                          </span>
                          {!alert.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#1A6B8A] inline-block" />
                          )}
                          <span className="text-xs text-slate-400">
                            {new Date(alert.triggered_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 text-sm">{alert.patient_name}</p>
                        <p className="text-sm text-slate-600 leading-relaxed mt-0.5">{alert.message}</p>
                        {alert.patient_id && (
                          <button
                            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: `patient-${alert.patient_id}` }))}
                            className="mt-2 text-xs font-bold text-[#1A6B8A] hover:underline"
                          >
                            {bn ? 'রোগীর প্রোফাইল দেখুন →' : 'View patient record →'}
                          </button>
                        )}
                      </div>
                    </div>
                    {!alert.is_read && (
                      <button
                        onClick={() => markRead(alert.id)}
                        className="p-2 text-slate-400 hover:text-[#1A6B8A] transition-colors shrink-0"
                        title={bn ? 'পড়েছি চিহ্নিত করুন' : 'Mark as read'}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
