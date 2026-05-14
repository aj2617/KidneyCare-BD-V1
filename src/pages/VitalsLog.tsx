import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Activity, Plus, History, Loader2, CheckCircle2,
  Flame, AlertTriangle, WifiOff, RefreshCw, CloudOff, Cloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { enqueueVital, getQueuedVitals, syncQueuedVitals, QueuedVital } from '../lib/offlineVitals';

const STREAK_MESSAGES: Record<string, Record<number, string>> = {
  en: {
    1: 'Great work! Keep logging daily.',
    5: 'Amazing! 5 days in a row!',
    10: 'Outstanding! 10-day streak!',
    30: 'Incredible! 30-day champion!',
  },
  bn: {
    1: 'চমৎকার! প্রতিদিন লগ করতে থাকুন।',
    5: 'অসাধারণ! পরপর ৫ দিন!',
    10: 'অবিশ্বাস্য! ১০ দিনের স্ট্রিক!',
    30: 'অবিশ্বাস্য! ৩০ দিনের চ্যাম্পিয়ন!',
  },
};

function getStreakMessage(streak: number, lang: string) {
  const msgs = STREAK_MESSAGES[lang] || STREAK_MESSAGES.en;
  if (streak >= 30) return msgs[30];
  if (streak >= 10) return msgs[10];
  if (streak >= 5) return msgs[5];
  return msgs[1];
}

const BLANK_FORM = {
  systolic: '', diastolic: '', blood_sugar: '', creatinine: '',
  urine_protein: 'Negative', weight: '', edema: false, fatigue: 5, medications: '',
};

export default function VitalsLog() {
  const { token } = useAuth();
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [streak, setStreak] = useState(0);
  const [validationError, setValidationError] = useState('');
  const [formData, setFormData] = useState({ ...BLANK_FORM });

  // Offline queue state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedVital[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);

  const bn = language === 'bn';

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/patient/vitals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setLogs(await res.json());
    } catch { /* offline — serve cached */ }
    finally { setIsLoading(false); }
  }, [token]);

  const fetchStreak = useCallback(async () => {
    try {
      const res = await fetch('/api/patient/streak', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { const d = await res.json(); setStreak(d.streak || 0); }
    } catch { /* offline */ }
  }, [token]);

  const refreshQueue = useCallback(async () => {
    const q = await getQueuedVitals();
    setQueue(q);
  }, []);

  useEffect(() => { fetchLogs(); fetchStreak(); refreshQueue(); }, []);

  // ── Online/offline detection ───────────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => { setIsOnline(true); handleSync(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [token]);

  // ── Listen for SW vitals-synced message ───────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'VITALS_SYNCED') {
        refreshQueue();
        fetchLogs();
        fetchStreak();
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // ── Client validation ──────────────────────────────────────────────────────
  const clientValidate = (): string | null => {
    const sys = parseInt(formData.systolic);
    const dia = parseInt(formData.diastolic);
    const cr = parseFloat(formData.creatinine);
    const bs = parseFloat(formData.blood_sugar);
    if (formData.systolic && (sys < 70 || sys > 250))
      return `Systolic BP ${sys} mmHg is outside plausible range (70–250).`;
    if (formData.diastolic && (dia < 40 || dia > 150))
      return `Diastolic BP ${dia} mmHg is outside range (40–150).`;
    if (formData.creatinine && (cr < 0.1 || cr > 30))
      return `Creatinine ${cr} mg/dL is outside range (0.1–30).`;
    if (formData.blood_sugar && (bs < 1 || bs > 60))
      return `Blood sugar ${bs} mmol/L is outside plausible range (1–60).`;
    return null;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientErr = clientValidate();
    if (clientErr) { setValidationError(clientErr); return; }
    setValidationError('');
    setIsSubmitting(true);
    setSavedOffline(false);

    try {
      const res = await fetch('/api/patient/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({ ...BLANK_FORM });
        fetchLogs();
        fetchStreak();
      } else {
        const d = await res.json();
        setValidationError(d.error || 'Submission failed');
      }
    } catch {
      // Offline — save to IndexedDB queue
      await enqueueVital(formData, `Bearer ${token}`);
      await refreshQueue();
      setSavedOffline(true);
      setShowForm(false);
      setFormData({ ...BLANK_FORM });

      // Register background sync if supported
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        await (reg as any).sync.register('sync-vitals').catch(() => {});
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Manual sync ────────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (isSyncing || queue.length === 0) return;
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncQueuedVitals();
      setSyncResult(result);
      await refreshQueue();
      if (result.synced > 0) { fetchLogs(); fetchStreak(); }
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncResult(null), 4000);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{t('vitals.title')}</h1>
          <p className="text-slate-500 text-sm">
            {bn ? 'আপনার দৈনিক স্বাস্থ্য সূচক ট্র্যাক করুন' : 'Track your daily health metrics'}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setValidationError(''); setSavedOffline(false); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1A6B8A] text-white rounded-xl font-bold hover:bg-[#14556e] transition-all shadow-lg shadow-[#1A6B8A]/20 min-h-[44px] shrink-0"
        >
          {showForm ? <History className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm
            ? (bn ? 'ইতিহাস দেখুন' : 'View History')
            : (bn ? 'লগ করুন' : 'Log Vitals')}
        </button>
      </div>

      {/* Offline / Sync banner */}
      <AnimatePresence>
        {(!isOnline || queue.length > 0) && (
          <motion.div
            key="offline-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${
              !isOnline
                ? 'bg-amber-50 border-amber-200'
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {!isOnline
                ? <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
                : <CloudOff className="w-5 h-5 text-blue-600 shrink-0" />
              }
              <div>
                <p className={`text-sm font-bold ${!isOnline ? 'text-amber-800' : 'text-blue-800'}`}>
                  {!isOnline
                    ? (bn ? 'আপনি অফলাইনে আছেন' : 'You are offline')
                    : (bn ? `${queue.length}টি ভাইটালস সিঙ্কের অপেক্ষায়` : `${queue.length} vital${queue.length !== 1 ? 's' : ''} pending sync`)
                  }
                </p>
                <p className={`text-xs mt-0.5 ${!isOnline ? 'text-amber-600' : 'text-blue-600'}`}>
                  {!isOnline
                    ? (bn ? 'ভাইটালস সংরক্ষণ করা হবে এবং পরে সিঙ্ক হবে।' : 'Vitals will be saved locally and synced when you reconnect.')
                    : (bn ? 'সংযোগ ফিরে এসেছে — সিঙ্ক করুন।' : 'Connection restored — tap to sync your pending entries.')
                  }
                </p>
              </div>
            </div>
            {isOnline && queue.length > 0 && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-60 shrink-0 min-h-[40px]"
              >
                {isSyncing
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />
                }
                {bn ? 'সিঙ্ক করুন' : 'Sync Now'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved offline toast */}
      <AnimatePresence>
        {savedOffline && (
          <motion.div
            key="saved-offline"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl"
          >
            <CloudOff className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-bold text-emerald-800">
              {bn
                ? 'ভাইটালস স্থানীয়ভাবে সংরক্ষিত হয়েছে। সংযোগ ফিরলে স্বয়ংক্রিয়ভাবে আপলোড হবে।'
                : 'Vitals saved locally. They will upload automatically when you reconnect.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync result toast */}
      <AnimatePresence>
        {syncResult && (
          <motion.div
            key="sync-result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex items-center gap-3 p-4 rounded-2xl border ${
              syncResult.failed === 0
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            {syncResult.failed === 0
              ? <Cloud className="w-5 h-5 text-emerald-600 shrink-0" />
              : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            }
            <p className={`text-sm font-bold ${syncResult.failed === 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
              {syncResult.failed === 0
                ? (bn
                    ? `${syncResult.synced}টি ভাইটালস সফলভাবে সিঙ্ক হয়েছে!`
                    : `${syncResult.synced} vital${syncResult.synced !== 1 ? 's' : ''} synced successfully!`)
                : (bn
                    ? `${syncResult.synced}টি সফল, ${syncResult.failed}টি ব্যর্থ।`
                    : `${syncResult.synced} synced, ${syncResult.failed} failed.`)
              }
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streak banner */}
      {streak > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-4 p-4 rounded-2xl border ${
            streak >= 10
              ? 'bg-amber-50 border-amber-200'
              : 'bg-[#1A6B8A]/5 border-[#1A6B8A]/20'
          }`}
        >
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            streak >= 10 ? 'bg-amber-100' : 'bg-[#1A6B8A]/10'
          }`}>
            <Flame className={`w-5 h-5 ${streak >= 10 ? 'text-amber-600' : 'text-[#1A6B8A]'}`} />
          </div>
          <div>
            <p className={`text-xl font-black ${streak >= 10 ? 'text-amber-700' : 'text-[#1A6B8A]'}`}>
              {streak} {bn ? 'দিনের স্ট্রিক!' : 'Day Streak!'}
            </p>
            <p className={`text-sm ${streak >= 10 ? 'text-amber-600' : 'text-[#1A6B8A]/80'}`}>
              {getStreakMessage(streak, language)}
            </p>
          </div>
        </motion.div>
      )}

      {/* Pending offline entries list */}
      {queue.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-black text-slate-700 flex items-center gap-2">
              <CloudOff className="w-4 h-4 text-blue-500" />
              {bn ? 'অপেক্ষমাণ ভাইটালস' : 'Pending Offline Entries'}
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full">
                {queue.length}
              </span>
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            {queue.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {entry.data.systolic}/{entry.data.diastolic} mmHg
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(entry.queuedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                  {bn ? 'সিঙ্কের অপেক্ষায়' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
          >
            {/* Offline mode hint on form */}
            {!isOnline && (
              <div className="mb-5 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700">
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                {bn
                  ? 'অফলাইন মোড — জমা দিলে স্থানীয়ভাবে সংরক্ষিত হবে।'
                  : 'Offline mode — submission will be saved locally and synced later.'}
              </div>
            )}

            {validationError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-700">
                    {bn ? 'মানটি গ্রহণযোগ্য সীমার বাইরে' : 'Value outside plausible range'}
                  </p>
                  <p className="text-sm text-red-600">{validationError}</p>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'systolic', label: bn ? 'সিস্টোলিক BP (mmHg)' : 'Systolic BP', placeholder: '120', type: 'number', required: true },
                  { key: 'diastolic', label: bn ? 'ডায়াস্টোলিক BP (mmHg)' : 'Diastolic BP', placeholder: '80', type: 'number', required: true },
                  { key: 'blood_sugar', label: bn ? 'রক্তের শর্করা (mmol/L)' : 'Blood Sugar', placeholder: '5.6', type: 'number', step: '0.1', required: true },
                  { key: 'creatinine', label: bn ? 'ক্রিয়েটিনিন (mg/dL)' : 'Creatinine', placeholder: '1.1', type: 'number', step: '0.01', required: true },
                  { key: 'weight', label: bn ? 'ওজন (কেজি)' : 'Weight (kg)', placeholder: '65', type: 'number', step: '0.1', required: false },
                ].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{field.label}</label>
                    <input
                      type={field.type}
                      step={(field as any).step}
                      required={field.required}
                      value={(formData as any)[field.key]}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A] transition-all"
                    />
                  </div>
                ))}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {bn ? 'প্রস্রাবে প্রোটিন' : 'Urine Protein'}
                  </label>
                  <select
                    value={formData.urine_protein}
                    onChange={e => setFormData({ ...formData, urine_protein: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20"
                  >
                    {['Negative', 'Trace', '1+', '2+', '3+', '4+'].map(v => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <input
                  type="checkbox"
                  id="edema"
                  checked={formData.edema}
                  onChange={e => setFormData({ ...formData, edema: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 accent-[#1A6B8A] shrink-0"
                />
                <label htmlFor="edema" className="text-sm font-semibold text-slate-700">
                  {bn ? 'পা বা শরীর ফুলে আছে (এডিমা)?' : 'Experiencing swelling (edema)?'}
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  {bn ? `ক্লান্তির মাত্রা: ${formData.fatigue}/10` : `Fatigue Level: ${formData.fatigue}/10`}
                </label>
                <input
                  type="range" min="1" max="10"
                  value={formData.fatigue}
                  onChange={e => setFormData({ ...formData, fatigue: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1A6B8A]"
                />
                <div className="flex justify-between text-xs text-slate-400 font-bold">
                  <span>{bn ? 'কম' : 'LOW'}</span>
                  <span>{bn ? 'বেশি' : 'HIGH'}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 min-h-[48px] ${
                  !isOnline
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                    : 'bg-[#1A6B8A] hover:bg-[#14556e] text-white shadow-lg shadow-[#1A6B8A]/20'
                }`}
              >
                {isSubmitting
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : !isOnline
                    ? <CloudOff className="w-5 h-5" />
                    : <CheckCircle2 className="w-5 h-5" />
                }
                {!isOnline
                  ? (bn ? 'অফলাইনে সংরক্ষণ করুন' : 'Save Offline')
                  : (bn ? 'ভাইটালস জমা দিন' : 'Submit Daily Log')
                }
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
              ))
            ) : logs.length > 0 ? (
              logs.map(log => (
                <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-slate-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-slate-100">
                      <span className="text-[9px] font-bold uppercase text-slate-400">
                        {new Date(log.date).toLocaleDateString(undefined, { month: 'short' })}
                      </span>
                      <span className="text-base font-black text-slate-700 leading-none">
                        {new Date(log.date).getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {log.systolic}/{log.diastolic} <span className="text-xs text-slate-400 font-normal">mmHg</span>
                      </p>
                      <p className="text-xs text-slate-500">Blood Pressure</p>
                      {log.logged_by === 'chw' && (
                        <span className="text-[10px] text-blue-600 font-bold">CHW visit</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    {[
                      { val: log.blood_sugar, label: 'Sugar' },
                      { val: log.creatinine, label: 'Creat' },
                      { val: log.urine_protein, label: 'Protein' },
                      {
                        val: log.edema
                          ? (bn ? 'হ্যাঁ' : 'Yes')
                          : (bn ? 'না' : 'No'),
                        label: 'Edema',
                        color: log.edema ? 'text-red-500' : 'text-emerald-600',
                      },
                    ].map(({ val, label, color }) => (
                      <div key={label}>
                        <p className={`font-bold text-sm ${color || 'text-slate-700'}`}>{val ?? '--'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                <History className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">
                  {bn ? 'এখনো কোনো ভাইটালস লগ করা হয়নি।' : 'No vitals logged yet. Start tracking your health today!'}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
