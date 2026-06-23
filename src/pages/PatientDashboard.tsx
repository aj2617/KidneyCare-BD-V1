import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Activity, AlertCircle, Flame, Utensils, Heart,
  ArrowUpRight, Plus, ChevronRight, BookOpen, DollarSign, Droplets, Loader2,
  Bell, X, Info, TriangleAlert, ClipboardList
} from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import ForcedSurveyOverlay from '../components/ForcedSurveyOverlay';

export default function PatientDashboard() {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [gfrHistory, setGfrHistory] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<{ score: number; factors: string[] }>({ score: 0, factors: [] });
  const [streak, setStreak] = useState(0);
  const [lastBP, setLastBP] = useState<{ systolic: number; diastolic: number; date: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [surveyCompleted, setSurveyCompleted] = useState<boolean | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [alerts, setAlerts] = useState<{ id: string; type: 'critical' | 'warning' | 'info'; title: string; message: string }[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('kc-dismissed-alerts') || '[]')); }
    catch { return new Set(); }
  });

  const isProfileIncomplete = Boolean(profile && (!profile.age || !profile.weight || !profile.sex));
  const nav = (page: string) => window.dispatchEvent(new CustomEvent('navigate', { detail: page }));

  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));
  const criticalCount = visibleAlerts.filter(a => a.type === 'critical').length;
  const unreadCount = visibleAlerts.length;

  const dismissAlert = (id: string) => {
    const next = new Set(dismissedAlerts);
    next.add(id);
    setDismissedAlerts(next);
    localStorage.setItem('kc-dismissed-alerts', JSON.stringify([...next]));
  };

  useEffect(() => {
    fetchData();
    checkSurveyStatus();
  }, []);

  const checkSurveyStatus = async () => {
    try {
      const res = await fetch('/api/patient/survey/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSurveyCompleted(data.completed);
      } else {
        setSurveyCompleted(true);
      }
    } catch {
      setSurveyCompleted(true);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [pRes, gRes, rRes, sRes, vRes, aRes] = await Promise.all([
        fetch('/api/patient/profile', { headers }),
        fetch('/api/patient/gfr-history', { headers }),
        fetch('/api/patient/risk-score', { headers }),
        fetch('/api/patient/streak', { headers }),
        fetch('/api/patient/vitals', { headers }),
        fetch('/api/patient/alerts', { headers }),
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
      if (aRes.ok) setAlerts(await aRes.json());
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
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" />
        <p className="text-slate-500 text-sm">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
      </div>
    );
  }

  const patientInitials = (user?.name || 'P')
    .split(' ').slice(0, 2).map((n: string) => n[0].toUpperCase()).join('');

  return (
    <div className="space-y-4 pb-6">

      {/* ── GREETING HEADER ── */}
      <div
        className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 pt-8 pb-4"
        style={{ background: '#1A6B8A', borderRadius: '0 0 1.5rem 1.5rem' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60 mb-0.5">
              {bn ? 'আপনার স্বাস্থ্য সারসংক্ষেপ' : 'Your Health Summary'}
            </p>
            <h1 className="text-lg font-black text-white tracking-tight">
              {bn ? 'হ্যালো, ' : 'Hello, '}{user?.name?.split(' ')[0] || (bn ? 'রোগী' : 'Patient')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Alert Bell */}
            <button
              onClick={() => setShowAlerts(v => !v)}
              className="relative p-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all active:scale-95"
              aria-label={bn ? 'সতর্কতা' : 'Alerts'}
            >
              <Bell className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-black text-white border-2 border-[#1A6B8A]"
                  style={{ background: criticalCount > 0 ? '#E74C3C' : '#F39C12' }}
                >
                  {unreadCount}
                </motion.span>
              )}
              {/* Pulsing ring when critical */}
              {criticalCount > 0 && (
                <motion.span
                  animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="absolute inset-0 rounded-xl"
                  style={{ background: '#E74C3C', zIndex: -1 }}
                />
              )}
            </button>
            <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white text-sm font-black">
              {patientInitials}
            </div>
          </div>
        </div>

        {/* ── ALERTS SLIDE-DOWN PANEL ── */}
        <AnimatePresence>
          {showAlerts && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="mt-4 space-y-2">
                {visibleAlerts.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 border border-white/20">
                    <Bell className="w-4 h-4 text-white/60" />
                    <p className="text-sm text-white/80 font-medium">
                      {bn ? 'কোনো নতুন সতর্কতা নেই' : 'No new alerts — all clear!'}
                    </p>
                  </div>
                ) : (
                  visibleAlerts.map(alert => {
                    const colors = {
                      critical: { bg: 'rgba(231,76,60,0.18)', border: 'rgba(231,76,60,0.5)', icon: '#E74C3C' },
                      warning:  { bg: 'rgba(243,156,18,0.18)', border: 'rgba(243,156,18,0.5)', icon: '#F39C12' },
                      info:     { bg: 'rgba(255,255,255,0.12)', border: 'rgba(255,255,255,0.2)', icon: '#ffffff' },
                    }[alert.type];
                    const Icon = alert.type === 'info' ? Info : TriangleAlert;
                    return (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                      >
                        <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: colors.icon }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white leading-snug">{alert.title}</p>
                          <p className="text-xs text-white/70 mt-0.5 leading-relaxed">{alert.message}</p>
                        </div>
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-white/60" />
                        </button>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Survey overlay — shown only when patient clicks the notification */}
      {showSurvey && (
        <ForcedSurveyOverlay
          token={token!}
          patientName={user?.name || ''}
          onComplete={() => { setSurveyCompleted(true); setShowSurvey(false); }}
        />
      )}

      {/* Survey notification banner */}
      <AnimatePresence>
        {surveyCompleted === false && !showSurvey && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex items-center justify-between gap-3 p-4 rounded-2xl shadow-sm"
            style={{ background: '#EFF8FB', border: '1px solid #1A6B8A' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: '#1A6B8A' }}
              >
                <ClipboardList className="w-5 h-5 text-white" />
              </motion.div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-snug" style={{ color: '#0f4560' }}>
                  {bn ? 'স্বাস্থ্য জরিপ সম্পূর্ণ করুন' : 'Complete your Health Survey'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#1A6B8A' }}>
                  {bn ? 'আপনার যত্নের মান উন্নত করতে সাহায্য করে' : 'Helps us personalise your care and risk score'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSurvey(true)}
              className="shrink-0 px-4 py-2 text-white text-xs font-bold rounded-xl transition-colors min-h-[44px] flex items-center"
              style={{ background: '#1A6B8A' }}
            >
              {bn ? 'শুরু করুন' : 'Start'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
        className={`relative overflow-hidden rounded-2xl px-5 py-3 ${risk.bg} shadow-lg`}
      >
        {/* decorative circle */}
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-8 -right-2 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative flex justify-between items-center mb-2">
          <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${risk.badge} ${risk.text}`}>
            {bn ? 'লাইভ ঝুঁকি ইঞ্জিন' : 'Live Risk Engine'}
          </span>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${risk.text} opacity-80`}>
            <AlertCircle className="w-3.5 h-3.5" />
            {risk.label}
          </div>
        </div>

        <div className="relative flex items-center gap-4">
          <div className="flex items-end gap-2">
            <span className={`text-5xl font-black leading-none ${risk.text}`}>{riskData.score}</span>
            <span className={`text-lg font-bold mb-1 ${risk.text} opacity-70`}>/100</span>
          </div>
          <div className="flex flex-col gap-1">
            <p className={`text-sm font-semibold leading-snug ${risk.text} opacity-90`}>
              {risk.msg}
            </p>
            {latestStage && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/20 w-fit`}>
                <span className={`text-xs font-bold ${risk.text}`}>
                  {bn ? `পর্যায় ${latestStage}` : `Stage ${latestStage}`} CKD
                </span>
              </div>
            )}
          </div>
        </div>
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
