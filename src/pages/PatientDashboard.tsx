import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Activity, AlertCircle, Flame, Utensils, Heart,
  ArrowUpRight, Plus, ChevronRight, BookOpen, DollarSign, Droplets
} from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

export default function PatientDashboard() {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [gfrHistory, setGfrHistory] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<{ score: number; factors: string[] }>({ score: 0, factors: [] });
  const [streak, setStreak] = useState(0);
  const [lastBP, setLastBP] = useState<{ systolic: number; diastolic: number; date: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const isProfileIncomplete = Boolean(profile && (!profile.age || !profile.weight || !profile.sex));
  const nav = (page: string) => window.dispatchEvent(new CustomEvent('navigate', { detail: page }));

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [pRes, gRes, rRes, sRes, vRes] = await Promise.all([
        fetch('/api/patient/profile', { headers }),
        fetch('/api/patient/gfr-history', { headers }),
        fetch('/api/patient/risk-score', { headers }),
        fetch('/api/patient/streak', { headers }),
        fetch('/api/patient/vitals', { headers }),
      ]);
      setProfile(await pRes.json());
      setGfrHistory(await gRes.json());
      setRiskData(await rRes.json());
      const sd = await sRes.json();
      setStreak(sd.streak || 0);
      const vitals: any[] = await vRes.json();
      if (Array.isArray(vitals) && vitals.length > 0) {
        const latest = vitals[0];
        if (latest.systolic && latest.diastolic) {
          setLastBP({ systolic: latest.systolic, diastolic: latest.diastolic, date: latest.date });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getRiskConfig = (score: number) => {
    if (score <= 25) return {
      bg: 'bg-[#2ECC71]', text: 'text-white', badge: 'bg-white/20',
      label: language === 'bn' ? 'কম ঝুঁকি' : 'Low Risk',
      msg: language === 'bn'
        ? 'আপনি ভালো করছেন! প্রতিদিন ভাইটালস লগ করুন।'
        : 'You\'re doing great! Keep logging daily vitals.',
    };
    if (score <= 50) return {
      bg: 'bg-[#F39C12]', text: 'text-white', badge: 'bg-white/20',
      label: language === 'bn' ? 'মাঝারি ঝুঁকি' : 'Moderate Risk',
      msg: language === 'bn'
        ? 'সচেতন থাকুন। নিয়মিত চেকআপ করুন।'
        : 'Stay vigilant. Follow your doctor\'s advice.',
    };
    if (score <= 75) return {
      bg: 'bg-[#E74C3C]', text: 'text-white', badge: 'bg-white/20',
      label: language === 'bn' ? 'উচ্চ ঝুঁকি' : 'High Risk',
      msg: language === 'bn'
        ? 'দ্রুত ডাক্তার দেখান। ওষুধ মিস করবেন না।'
        : 'See your doctor soon. Don\'t miss medications.',
    };
    return {
      bg: 'bg-[#C0392B]', text: 'text-white', badge: 'bg-white/20',
      label: language === 'bn' ? 'মারাত্মক ঝুঁকি' : 'Critical Risk',
      msg: language === 'bn'
        ? 'জরুরি চিকিৎসা প্রয়োজন। এখনই ডাক্তার দেখান!'
        : 'Urgent care needed. See a doctor immediately!',
    };
  };

  const latestGfr = gfrHistory.length > 0 ? Math.round(gfrHistory[gfrHistory.length - 1].mdrd) : null;
  const latestStage = gfrHistory.length > 0 ? gfrHistory[gfrHistory.length - 1].stage : null;
  const latestRec = gfrHistory.length > 0 ? gfrHistory[gfrHistory.length - 1].recommendation : null;
  const sparkData = gfrHistory.slice(-8).map((g, i) => ({ i, v: Math.round(g.mdrd) }));
  const risk = getRiskConfig(riskData.score);

  const bn = language === 'bn';

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 rounded-3xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-36 rounded-2xl bg-slate-200" />
          <div className="h-36 rounded-2xl bg-slate-200" />
        </div>
        <div className="h-28 rounded-2xl bg-slate-200" />
        <div className="h-40 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">

      {/* Profile incomplete banner */}
      <AnimatePresence>
        {isProfileIncomplete && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex items-center justify-between gap-3 p-4 rounded-2xl shadow-sm"
            style={{ background: '#FEF5E7', border: '1px solid #F39C12' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="shrink-0 w-2.5 h-2.5 rounded-full"
                style={{ background: '#F39C12' }}
              />
              <p className="text-sm font-semibold leading-snug" style={{ color: '#7d5100' }}>
                {bn ? 'সঠিক স্কোরের জন্য প্রোফাইল সম্পূর্ণ করুন' : 'Complete your profile for accurate scoring'}
              </p>
            </div>
            <button
              onClick={() => nav('profile')}
              className="shrink-0 px-3 py-1.5 text-white text-xs font-bold rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center"
              style={{ background: '#F39C12' }}
            >
              {bn ? 'আপডেট' : 'Update'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO RISK CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-3xl p-6 ${risk.bg} shadow-lg`}
      >
        {/* decorative circle */}
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-14 -right-4 w-52 h-52 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative flex justify-between items-start mb-4">
          <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${risk.badge} ${risk.text}`}>
            {bn ? 'লাইভ ঝুঁকি ইঞ্জিন' : 'Live Risk Engine'}
          </span>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${risk.text} opacity-80`}>
            <AlertCircle className="w-3.5 h-3.5" />
            {risk.label}
          </div>
        </div>

        <div className="relative">
          <div className="flex items-end gap-3 mb-2">
            <span className={`text-7xl font-black leading-none ${risk.text}`}>{riskData.score}</span>
            <span className={`text-2xl font-bold mb-2 ${risk.text} opacity-70`}>/100</span>
          </div>
          <p className={`text-base font-semibold leading-snug ${risk.text} opacity-90 max-w-xs`}>
            {risk.msg}
          </p>
        </div>

        {/* CKD Stage chip */}
        {latestStage && (
          <div className={`relative mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/20`}>
            <span className={`text-sm font-bold ${risk.text}`}>
              {bn ? `পর্যায় ${latestStage}` : `Stage ${latestStage}`} CKD
            </span>
          </div>
        )}
      </motion.div>

      {/* ── MINI STATS ROW ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Last BP card */}
        {lastBP && (
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            onClick={() => nav('vitals')}
            className="col-span-2 text-left p-4 rounded-2xl border shadow-sm active:scale-95 transition-transform flex items-center justify-between"
            style={lastBP.systolic >= 140 || lastBP.diastolic >= 90 ? { background: '#FDECEA', borderColor: '#E74C3C' } : { background: '#fff', borderColor: '#f1f5f9' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={lastBP.systolic >= 140 || lastBP.diastolic >= 90 ? { background: '#FDECEA', color: '#E74C3C' } : { background: '#EFF8FB', color: '#1A6B8A' }}>
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black leading-none" style={lastBP.systolic >= 140 || lastBP.diastolic >= 90 ? { color: '#7b1a1a' } : { color: '#0f172a' }}>
                  {lastBP.systolic}/{lastBP.diastolic}
                  <span className="text-sm font-semibold text-slate-400 ml-1">mmHg</span>
                </p>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  {bn ? 'সর্বশেষ রক্তচাপ' : 'Last Blood Pressure'}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold px-2 py-1 rounded-lg" style={lastBP.systolic >= 140 || lastBP.diastolic >= 90 ? { background: '#FDECEA', color: '#7b1a1a' } : { background: '#EAFAF1', color: '#1a7a44' }}>
                {lastBP.systolic >= 140 || lastBP.diastolic >= 90 ? (bn ? 'উচ্চ' : 'High') : (bn ? 'স্বাভাবিক' : 'Normal')}
              </p>
              <p className="text-xs text-slate-400 mt-1">{new Date(lastBP.date).toLocaleDateString()}</p>
            </div>
          </motion.button>
        )}

        {/* GFR Sparkline card */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => nav('gfr')}
          className="text-left p-4 bg-white rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-transform min-h-[140px] flex flex-col justify-between"
        >
          <div className="flex justify-between items-center">
            <div className="p-2 rounded-xl" style={{ background: '#EFF8FB', color: '#1A6B8A' }}>
              <Activity className="w-5 h-5" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 leading-none">
              {latestGfr ?? '--'}
            </p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              {bn ? 'সর্বশেষ ইজিএফআর' : 'Latest eGFR'}
            </p>
          </div>
          {/* mini sparkline */}
          {sparkData.length > 1 && (
            <div className="h-10 w-full mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="#1A6B8A"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(v: any) => [`${v} mL/min`, 'GFR']}
                    labelFormatter={() => ''}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.button>

        {/* Streak card */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => nav('vitals')}
          className="text-left p-4 rounded-2xl border shadow-sm active:scale-95 transition-transform min-h-[140px] flex flex-col justify-between"
          style={streak >= 5 ? { background: '#FEF5E7', borderColor: '#F39C12' } : { background: '#fff', borderColor: '#f1f5f9' }}
        >
          <div className="flex justify-between items-center">
            <div className="p-2 rounded-xl" style={streak >= 5 ? { background: '#FDE9C3', color: '#F39C12' } : { background: '#f1f5f9', color: '#94a3b8' }}>
              <Flame className="w-5 h-5" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </div>
          <div>
            <p className="text-3xl font-black leading-none" style={streak >= 5 ? { color: '#F39C12' } : { color: '#0f172a' }}>
              {streak}
            </p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              {bn ? 'দিনের স্ট্রিক' : 'Day streak'}
            </p>
          </div>
          <p className="text-xs font-semibold" style={streak >= 5 ? { color: '#F39C12' } : { color: '#94a3b8' }}>
            {streak === 0
              ? (bn ? 'আজ শুরু করুন!' : 'Start today!')
              : streak >= 10
              ? (bn ? '🔥 অসাধারণ!' : '🔥 Incredible!')
              : streak >= 5
              ? (bn ? '🔥 দারুণ চলছে!' : '🔥 On a roll!')
              : (bn ? 'চালিয়ে যান!' : 'Keep it up!')}
          </p>
        </motion.button>
      </div>

      {/* ── ACTIVE RISK FACTORS ── */}
      {riskData.factors && riskData.factors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"
        >
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            {bn ? 'সক্রিয় ঝুঁকির কারণ' : 'Active Risk Factors'}
          </p>
          <div className="flex flex-wrap gap-2">
            {riskData.factors.map((f, i) => (
              <span
                key={i}
                className="px-3 py-1.5 text-xs font-bold rounded-full"
                style={{ background: '#FDECEA', border: '1px solid #E74C3C', color: '#7b1a1a' }}
              >
                {f}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── CLINICAL RECOMMENDATION ── */}
      {latestRec && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            {bn ? 'ক্লিনিকাল পরামর্শ' : 'Clinical Recommendation'}
          </p>
          <p className="text-sm leading-relaxed text-slate-200 mb-4">{latestRec}</p>
          <button
            onClick={() => nav('education')}
            className="flex items-center gap-2 text-sm font-bold text-white bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-4 py-2.5 min-h-[44px]"
          >
            {bn ? 'অ্যাকশন প্ল্যান দেখুন' : 'View Action Plan'}
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* ── QUICK ACTIONS GRID ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid grid-cols-2 gap-3"
      >
        <button
          onClick={() => nav('diet')}
          className="flex flex-col items-center gap-2.5 p-4 bg-white border border-slate-100 rounded-2xl hover:border-[#1A6B8A]/30 hover:bg-[#1A6B8A]/5 active:scale-95 transition-all min-h-[80px] justify-center shadow-sm"
        >
          <Utensils className="w-7 h-7 text-[#2ECC71]" />
          <span className="text-sm font-bold text-slate-700 text-center leading-tight">
            {bn ? 'ডায়েট সহকারী' : 'Diet Assistant'}
          </span>
        </button>

        <button
          onClick={() => nav('caregiver')}
          className="flex flex-col items-center gap-2.5 p-4 bg-white border border-slate-100 rounded-2xl hover:border-[#1A6B8A]/30 hover:bg-[#1A6B8A]/5 active:scale-95 transition-all min-h-[80px] justify-center shadow-sm"
        >
          <Heart className="w-7 h-7 text-[#E74C3C]" />
          <span className="text-sm font-bold text-slate-700 text-center leading-tight">
            {bn ? 'পরিচর্যাকারী' : 'Caregiver'}
          </span>
        </button>

        <button
          onClick={() => nav('education')}
          className="flex flex-col items-center gap-2.5 p-4 bg-white border border-slate-100 rounded-2xl hover:border-[#1A6B8A]/30 hover:bg-[#1A6B8A]/5 active:scale-95 transition-all min-h-[80px] justify-center shadow-sm"
        >
          <BookOpen className="w-7 h-7 text-[#1A6B8A]" />
          <span className="text-sm font-bold text-slate-700 text-center leading-tight">
            {bn ? 'শিক্ষা কেন্দ্র' : 'Education Hub'}
          </span>
        </button>

        <button
          onClick={() => nav('cost')}
          className="flex flex-col items-center gap-2.5 p-4 bg-white border border-slate-100 rounded-2xl hover:border-[#1A6B8A]/30 hover:bg-[#1A6B8A]/5 active:scale-95 transition-all min-h-[80px] justify-center shadow-sm"
        >
          <DollarSign className="w-7 h-7 text-[#F39C12]" />
          <span className="text-sm font-bold text-slate-700 text-center leading-tight">
            {bn ? 'খরচ পরিকল্পনা' : 'Cost Planner'}
          </span>
        </button>
      </motion.div>

      {/* ── FAB: Log Today's Vitals ── */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 18 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => nav('vitals')}
        className="fixed bottom-20 right-5 z-40 flex items-center gap-2 px-5 py-3.5 bg-[#1A6B8A] text-white text-sm font-bold rounded-full shadow-xl shadow-[#1A6B8A]/30 hover:bg-[#14556e] transition-colors md:hidden"
        aria-label={bn ? 'আজকের ভাইটালস লগ করুন' : "Log Today's Vitals"}
      >
        <Plus className="w-5 h-5" />
        {bn ? 'আজকের ভাইটালস' : "Log Vitals"}
      </motion.button>
    </div>
  );
}
