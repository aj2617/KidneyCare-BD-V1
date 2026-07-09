import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Activity, AlertCircle, Flame, Utensils, Heart,
  ArrowUpRight, Plus, ChevronRight, BookOpen, DollarSign, Droplets, Loader2,
  Bell, X, Info, TriangleAlert, Shield, CalendarDays
} from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip
} from 'recharts';
import { Video, PhoneCall, Clock as ClockIcon } from 'lucide-react';
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
  const [alerts, setAlerts] = useState<{ id: string; type: 'critical' | 'warning' | 'info'; title: string; message: string }[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('kc-dismissed-alerts') || '[]')); }
    catch { return new Set(); }
  });
  const [appointments, setAppointments] = useState<any[]>([]);
  const [requestingEmergency, setRequestingEmergency] = useState(false);

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
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [pRes, gRes, rRes, sRes, vRes, aRes, apptRes] = await Promise.all([
        fetch('/api/patient/profile', { headers }),
        fetch('/api/patient/gfr-history', { headers }),
        fetch('/api/patient/risk-score', { headers }),
        fetch('/api/patient/streak', { headers }),
        fetch('/api/patient/vitals', { headers }),
        fetch('/api/patient/alerts', { headers }),
        fetch('/api/appointments', { headers }),
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
      if (apptRes.ok) setAppointments(await apptRes.json());
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
        : "You're doing great! Keep logging daily vitals.",
    };
    if (score <= 50) return {
      bg: 'bg-[#F39C12]', text: 'text-white', badge: 'bg-white/20',
      label: language === 'bn' ? 'মাঝারি ঝুঁকি' : 'Moderate Risk',
      msg: language === 'bn'
        ? 'সচেতন থাকুন। নিয়মিত চেকআপ করুন।'
        : "Stay vigilant. Follow your doctor's advice.",
    };
    if (score <= 75) return {
      bg: 'bg-[#E74C3C]', text: 'text-white', badge: 'bg-white/20',
      label: language === 'bn' ? 'উচ্চ ঝুঁকি' : 'High Risk',
      msg: language === 'bn'
        ? 'দ্রুত ডাক্তার দেখান। ওষুধ মিস করবেন না।'
        : "See your doctor soon. Don't miss medications.",
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
  const gfrTrend = sparkData.length > 1 && sparkData[0].v
    ? Math.round(((sparkData[sparkData.length - 1].v - sparkData[0].v) / sparkData[0].v) * 100)
    : null;
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

  const requestEmergency = async () => {
    setRequestingEmergency(true);
    try {
      await fetch('/api/patient/appointment-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'emergency', reason: bn ? 'জরুরি কল প্রয়োজন' : 'Emergency consultation requested' }),
      });
      fetchData();
    } finally {
      setRequestingEmergency(false);
    }
  };

  return (
    <div className="space-y-3 pb-6">

      {/* ── GREETING HEADER ── */}
      <div
        className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 pt-5 pb-3"
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
                      {bn ? 'কোনো নতুন সতর্কতা নেই — সব ঠিক আছে!' : 'No new alerts — all clear!'}
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

      {/* ── DASHBOARD CONTENT ── */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          {/* ── HERO RISK CARD ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[140px_minmax(0,1fr)]"
          >
            <div className={`flex flex-col items-center justify-center gap-2 px-4 py-5 text-white ${risk.bg}`}>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/70">
                {bn ? 'ঝুঁকি স্কোর' : 'Risk Score'}
              </span>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black leading-none">{riskData.score}</span>
                <span className="mb-1 text-lg font-bold opacity-80">/100</span>
              </div>
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold">
                {risk.label}
              </span>
            </div>

            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {bn ? 'লাইভ ঝুঁকি ইঞ্জিন স্ট্যাটাস' : 'Live Risk Engine Status'}
                  </h2>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#FFF2EA] px-3 py-1 text-xs font-bold text-[#C0392B]">
                    {latestStage ? `${bn ? `পর্যায় ${latestStage}` : `Stage ${latestStage}`} CKD` : (bn ? 'পর্যায় অজানা' : 'Stage unknown')}
                  </div>
                </div>
                <div className="rounded-2xl border border-red-100 bg-[#FFF6F3] p-2 text-[#F4A8A0]">
                  <TriangleAlert className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm italic text-slate-500">
                {risk.msg}
              </p>
              <div className="flex flex-wrap gap-2">
                {(riskData.factors?.length ? riskData.factors.slice(0, 2) : [
                  bn ? 'উচ্চ রক্তচাপ' : 'Elevated BP levels',
                  bn ? 'পারিবারিক কিডনি ঝুঁকি' : 'Family history risk',
                ]).map((factor, index) => (
                  <span key={index} className="inline-flex items-center gap-1 rounded-full border border-[#F1D0C8] bg-[#FFF7F4] px-3 py-1 text-xs font-bold text-[#7B1A1A]">
                    <span className="h-2 w-2 rounded-full bg-[#E74C3C]" />
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="grid gap-3 sm:grid-cols-2">
            {lastBP && (
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 }}
                onClick={() => nav('vitals')}
                className="text-left rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-transform active:scale-95"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-xl bg-[#EAF5F9] p-2 text-[#1A6B8A]">
                    <Droplets className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-[#E8F8EE] px-2 py-1 text-[10px] font-bold text-[#22A55D]">
                    {lastBP.systolic >= 140 || lastBP.diastolic >= 90 ? (bn ? 'উচ্চ' : 'High') : (bn ? 'স্বাভাবিক' : 'Normal')}
                  </span>
                </div>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {bn ? 'রক্তচাপ' : 'Blood Pressure'}
                </p>
                <p className="mt-1 text-3xl font-black leading-none text-slate-900">
                  {lastBP.systolic}/{lastBP.diastolic}
                  <span className="ml-1 text-xs font-semibold text-slate-400">mmHg</span>
                </p>
                <div className="mt-4 flex items-end gap-1.5">
                  {[10, 18, 14, 28, 20].map((height, index) => (
                    <div key={index} className="w-10 rounded-t-md bg-[#BFD8E1]" style={{ height }} />
                  ))}
                </div>
              </motion.button>
            )}

            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              onClick={() => nav('gfr')}
              className="text-left rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-transform active:scale-95"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-xl bg-[#EAF5F9] p-2 text-[#1A6B8A]">
                  <Activity className="h-4 w-4" />
                </div>
                <span className={`text-[10px] font-bold ${gfrTrend !== null && gfrTrend < 0 ? 'text-[#C0392B]' : 'text-[#22A55D]'}`}>
                  {gfrTrend !== null ? `${gfrTrend > 0 ? '+' : ''}${gfrTrend}%` : '--'}
                </span>
              </div>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {bn ? 'সর্বশেষ ইজিএফআর' : 'Latest eGFR'}
              </p>
              <p className="mt-1 text-3xl font-black leading-none text-slate-900">
                {latestGfr ?? '--'}
                <span className="ml-1 text-xs font-semibold text-slate-400">mL/min</span>
              </p>
              {sparkData.length > 1 && (
                <div className="mt-4 h-16 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparkData}>
                      <Line
                        type="monotone"
                        dataKey="v"
                        stroke="#0C5F7C"
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
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl bg-[#2F3337] p-4 text-white shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#8ED1FF]" />
              <p className="text-sm font-black uppercase tracking-widest text-[#8ED1FF]">
                {bn ? 'ক্লিনিক্যাল পরামর্শ' : 'Clinical Recommendation'}
              </p>
            </div>
            <ul className="space-y-2 text-sm font-semibold text-white">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white" />
                <span>{latestRec || (bn ? 'প্রতি ৩ মাসে মনিটর করুন; জীবনধারা পরিবর্তন করুন' : 'Monitor every 3 months; lifestyle modification')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white" />
                <span>{bn ? 'প্রতিদিন ২,০০০ mg-এর নিচে সোডিয়াম সীমিত রাখুন' : 'Limit sodium intake to under 2,000mg per day'}</span>
              </li>
            </ul>
            <button
              onClick={() => nav('education')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#11709A] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0f5e80]"
            >
              {bn ? 'অ্যাকশন প্ল্যান দেখুন' : 'View Action Plan'}
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3"
          >
            {[
              { key: 'diet',      icon: Utensils,  color: '#2ECC71', label: bn ? 'ডায়েট সহকারী' : 'Diet Assistant' },
              { key: 'caregiver', icon: Heart,     color: '#E74C3C', label: bn ? 'পরিচর্যাকারী' : 'Caregiver' },
              { key: 'education', icon: BookOpen,   color: '#1A6B8A', label: bn ? 'শিক্ষা কেন্দ্র' : 'Education Hub' },
              { key: 'cost',      icon: DollarSign, color: '#F39C12', label: bn ? 'খরচ পরিকল্পনা' : 'Cost Planner' },
            ].map(({ key, icon: Icon, color, label }) => (
              <button
                key={key}
                onClick={() => nav(key)}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm transition-all hover:border-[#1A6B8A]/30 hover:bg-[#1A6B8A]/5 active:scale-95"
              >
                <Icon className="h-6 w-6" style={{ color }} />
                <span className="text-xs font-bold leading-tight text-slate-700">{label}</span>
              </button>
            ))}
          </motion.div>

        </div>

        <div className="space-y-3 lg:sticky lg:top-4 self-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-500">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <p className="text-3xl font-black leading-none text-slate-900">{streak}</p>
                <p className="text-xs font-semibold text-slate-500">
                  {bn ? 'দিনের স্ট্রিক' : 'Day streak'}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              {bn ? 'সক্রিয় ঝুঁকির কারণ' : 'Active Risk Factors'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(riskData.factors?.length ? riskData.factors.slice(0, 4) : [bn ? 'কোনো ঝুঁকি নেই' : 'No active risk factors']).map((factor, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 rounded-full border border-[#F1D0C8] bg-[#FFF7F4] px-3 py-1 text-xs font-bold text-[#7B1A1A]"
                >
                  <span className="h-2 w-2 rounded-full bg-[#E74C3C]" />
                  {factor}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                {bn ? 'ডাক্তার অ্যাপয়েন্টমেন্ট' : 'Appointments'}
              </p>
              <Video className="w-4 h-4 text-[#1A6B8A]" />
            </div>

            <button
              onClick={requestEmergency}
              disabled={requestingEmergency}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 disabled:opacity-60"
            >
              {requestingEmergency ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
              {bn ? 'জরুরি কল রিকোয়েস্ট' : 'Request Emergency Call'}
            </button>

            {appointments.length > 0 && (
              <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto">
                {appointments.map(appt => (
                  <div key={appt.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-left">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{appt.doctor_name || 'Assigned Doctor'}</p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {new Date(appt.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        appt.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        appt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {appt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

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
        {bn ? 'ভাইটালস লগ' : 'Log Vitals'}
      </motion.button>
    </div>
  );
}
