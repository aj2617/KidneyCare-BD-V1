import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Activity, Plus, History, Loader2, CheckCircle2, Flame, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STREAK_MESSAGES: Record<string, Record<number, string>> = {
  en: { 1: 'Great work! Keep logging daily.', 5: 'Amazing! 5 days in a row! 🔥', 10: 'Outstanding! 10-day streak! 🏆', 30: 'Incredible! 30-day champion! 🥇' },
  bn: { 1: 'চমৎকার! প্রতিদিন লগ করতে থাকুন।', 5: 'অসাধারণ! পরপর ৫ দিন! 🔥', 10: 'অবিশ্বাস্য! ১০ দিনের স্ট্রিক! 🏆', 30: 'অবিশ্বাস্য! ৩০ দিনের চ্যাম্পিয়ন! 🥇' },
};

function getStreakMessage(streak: number, lang: string) {
  const msgs = STREAK_MESSAGES[lang] || STREAK_MESSAGES.en;
  if (streak >= 30) return msgs[30];
  if (streak >= 10) return msgs[10];
  if (streak >= 5) return msgs[5];
  return msgs[1];
}

export default function VitalsLog() {
  const { token } = useAuth();
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [streak, setStreak] = useState(0);
  const [validationError, setValidationError] = useState('');
  const [formData, setFormData] = useState({
    systolic: '', diastolic: '', blood_sugar: '', creatinine: '',
    urine_protein: 'Negative', weight: '', edema: false, fatigue: 5, medications: ''
  });

  useEffect(() => { fetchLogs(); fetchStreak(); }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/patient/vitals', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setLogs(await res.json());
    } catch { /* offline */ }
    finally { setIsLoading(false); }
  };

  const fetchStreak = async () => {
    try {
      const res = await fetch('/api/patient/streak', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setStreak(d.streak || 0); }
    } catch { /* offline */ }
  };

  const clientValidate = (): string | null => {
    const sys = parseInt(formData.systolic);
    const dia = parseInt(formData.diastolic);
    const cr = parseFloat(formData.creatinine);
    const bs = parseFloat(formData.blood_sugar);
    if (formData.systolic && (sys < 70 || sys > 250)) return `Systolic BP ${sys} mmHg is outside plausible range (70–250 mmHg).`;
    if (formData.diastolic && (dia < 40 || dia > 150)) return `Diastolic BP ${dia} mmHg is outside range (40–150 mmHg).`;
    if (formData.creatinine && (cr < 0.1 || cr > 30)) return `Creatinine ${cr} mg/dL is outside range (0.1–30 mg/dL).`;
    if (formData.blood_sugar && (bs < 1 || bs > 60)) return `Blood sugar ${bs} mmol/L is outside plausible range (1–60 mmol/L).`;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientErr = clientValidate();
    if (clientErr) { setValidationError(clientErr); return; }
    setValidationError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/patient/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowForm(false);
        fetchLogs();
        fetchStreak();
        setFormData({ systolic: '', diastolic: '', blood_sugar: '', creatinine: '', urine_protein: 'Negative', weight: '', edema: false, fatigue: 5, medications: '' });
      } else {
        const data = await res.json();
        setValidationError(data.error || 'Submission failed');
      }
    } catch { /* offline - could save to IndexedDB here */ }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('vitals.title')}</h1>
          <p className="text-slate-500">{language === 'bn' ? 'আপনার দৈনিক স্বাস্থ্য সূচক ট্র্যাক করুন' : 'Track your daily health metrics'}</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setValidationError(''); }}
          className="px-6 py-3 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#14556e] transition-all shadow-lg shadow-[#1A6B8A]/20">
          {showForm ? <Activity className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showForm ? (language === 'bn' ? 'ইতিহাস দেখুন' : 'View History') : (language === 'bn' ? 'নতুন ভাইটালস লগ করুন' : 'Log New Vitals')}
        </button>
      </div>

      {/* Streak Banner */}
      {streak > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-4 p-5 rounded-2xl border ${streak >= 10 ? 'bg-amber-50 border-amber-200' : 'bg-[#1A6B8A]/5 border-[#1A6B8A]/20'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${streak >= 10 ? 'bg-amber-100' : 'bg-[#1A6B8A]/10'}`}>
            <Flame className={`w-6 h-6 ${streak >= 10 ? 'text-amber-600' : 'text-[#1A6B8A]'}`} />
          </div>
          <div>
            <p className={`text-2xl font-black ${streak >= 10 ? 'text-amber-700' : 'text-[#1A6B8A]'}`}>
              {streak} {language === 'bn' ? 'দিনের স্ট্রিক!' : 'Day Streak!'}
            </p>
            <p className={`text-sm ${streak >= 10 ? 'text-amber-600' : 'text-[#1A6B8A]/80'}`}>
              {getStreakMessage(streak, language)}
            </p>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto">

            {validationError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-700">{language === 'bn' ? 'মানটি গ্রহণযোগ্য সীমার বাইরে' : 'Value outside plausible range'}</p>
                  <p className="text-sm text-red-600">{validationError}</p>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'সিস্টোলিক BP (mmHg)' : 'Systolic BP (mmHg)'}</label>
                  <input type="number" required value={formData.systolic} onChange={e => setFormData({ ...formData, systolic: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20" placeholder="120" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'ডায়াস্টোলিক BP (mmHg)' : 'Diastolic BP (mmHg)'}</label>
                  <input type="number" required value={formData.diastolic} onChange={e => setFormData({ ...formData, diastolic: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20" placeholder="80" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'রক্তের শর্করা (mmol/L)' : 'Blood Sugar (mmol/L)'}</label>
                  <input type="number" step="0.1" required value={formData.blood_sugar} onChange={e => setFormData({ ...formData, blood_sugar: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20" placeholder="5.6" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'ক্রিয়েটিনিন (mg/dL)' : 'Creatinine (mg/dL)'}</label>
                  <input type="number" step="0.01" required value={formData.creatinine} onChange={e => setFormData({ ...formData, creatinine: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20" placeholder="1.1" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'ওজন (কেজি)' : 'Weight (kg)'}</label>
                  <input type="number" step="0.1" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20" placeholder="65" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'প্রস্রাবে প্রোটিন' : 'Urine Protein'}</label>
                  <select value={formData.urine_protein} onChange={e => setFormData({ ...formData, urine_protein: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20">
                    {['Negative', 'Trace', '1+', '2+', '3+', '4+'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <input type="checkbox" id="edema" checked={formData.edema} onChange={e => setFormData({ ...formData, edema: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 accent-[#1A6B8A]" />
                <label htmlFor="edema" className="text-sm font-semibold text-slate-700">
                  {language === 'bn' ? 'পা বা শরীর ফুলে আছে (এডিমা)?' : 'Are you experiencing any swelling (edema)?'}
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  {language === 'bn' ? `ক্লান্তির মাত্রা: ${formData.fatigue}/10` : `Fatigue Level: ${formData.fatigue}/10`}
                </label>
                <input type="range" min="1" max="10" value={formData.fatigue} onChange={e => setFormData({ ...formData, fatigue: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1A6B8A]" />
                <div className="flex justify-between text-xs text-slate-400 font-bold">
                  <span>{language === 'bn' ? 'কম' : 'LOW'}</span>
                  <span>{language === 'bn' ? 'বেশি' : 'HIGH'}</span>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting}
                className="w-full py-4 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#14556e] transition-all disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {language === 'bn' ? 'ভাইটালস জমা দিন' : 'Submit Daily Log'}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" /></div>
            ) : logs.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {logs.map(log => (
                  <div key={log.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-slate-400">
                        <span className="text-[10px] font-bold uppercase">{new Date(log.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                        <span className="text-lg font-black text-slate-700 leading-none">{new Date(log.date).getDate()}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{log.systolic}/{log.diastolic} <span className="text-xs text-slate-400 font-normal">mmHg</span></p>
                        <p className="text-xs text-slate-500">Blood Pressure</p>
                        {log.logged_by === 'chw' && <span className="text-xs text-blue-600 font-bold">CHW visit</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <div><p className="font-bold text-slate-700">{log.blood_sugar}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Sugar</p></div>
                      <div><p className="font-bold text-slate-700">{log.creatinine}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Creatinine</p></div>
                      <div><p className="font-bold text-slate-700">{log.urine_protein}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Protein</p></div>
                      <div><p className={`font-bold ${log.edema ? 'text-red-500' : 'text-emerald-500'}`}>{log.edema ? (language === 'bn' ? 'হ্যাঁ' : 'Yes') : (language === 'bn' ? 'না' : 'No')}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Edema</p></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">
                  {language === 'bn' ? 'এখনো কোনো ভাইটালস লগ করা হয়নি।' : 'No vitals logged yet. Start tracking your health today!'}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
