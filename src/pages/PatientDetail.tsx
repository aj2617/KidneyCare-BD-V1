import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ArrowLeft, TrendingDown, Activity, Video, FileText,
  MessageSquare, ThumbsUp, ThumbsDown, Calendar, Plus,
  AlertCircle, Loader2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { motion } from 'motion/react';

function SkeletonBlock({ h = 'h-40' }: { h?: string }) {
  return <div className={`${h} rounded-2xl bg-slate-100 animate-pulse`} />;
}

const GFR_STAGE = (v: number) => {
  if (v >= 90) return { stage: 1, color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (v >= 60) return { stage: 2, color: 'text-blue-600', bg: 'bg-blue-50' };
  if (v >= 45) return { stage: '3a', color: 'text-yellow-600', bg: 'bg-yellow-50' };
  if (v >= 30) return { stage: '3b', color: 'text-orange-600', bg: 'bg-orange-50' };
  if (v >= 15) return { stage: 4, color: 'text-red-600', bg: 'bg-red-50' };
  return { stage: 5, color: 'text-red-800', bg: 'bg-red-100' };
};

export default function PatientDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [activeVitalsRange, setActiveVitalsRange] = useState<7 | 30 | 90>(30);

  const bn = language === 'bn';

  useEffect(() => {
    setLoading(true);
    fetch(`/api/doctor/patient/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setData(d);
        if (d.prescriptions) setPrescriptions(d.prescriptions);
        setLoading(false);
      });
  }, [id]);

  const startTeleconsult = () => {
    if (!data?.patient) return;
    window.dispatchEvent(new CustomEvent('navigate', {
      detail: { page: 'teleconsult', teleconsultPatient: { id: parseInt(id), name: data.patient.name } },
    }));
  };

  const submitFeedback = async (type: 'too_high' | 'too_low' | 'correct') => {
    await fetch('/api/doctor/risk-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        patient_id: parseInt(id),
        reported_score: data?.patient?.risk_score,
        feedback: type + (feedbackText ? `: ${feedbackText}` : ''),
      }),
    });
    setFeedbackSent(true);
  };

  if (loading) return (
    <div className="space-y-4">
      <SkeletonBlock h="h-32" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonBlock h="h-64" />
        <SkeletonBlock h="h-64" />
      </div>
      <SkeletonBlock h="h-48" />
    </div>
  );

  if (!data?.patient) return (
    <div className="p-8 text-center text-slate-400">
      <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p>{bn ? 'রোগীর তথ্য পাওয়া যায়নি।' : 'Patient data not available.'}</p>
    </div>
  );

  const { patient, vitals, gfr } = data;
  const latestGfr = gfr?.length > 0 ? gfr[gfr.length - 1] : null;
  const latestGfrVal = latestGfr?.mdrd ? Math.round(latestGfr.mdrd) : null;
  const gfrStage = latestGfrVal ? GFR_STAGE(latestGfrVal) : null;

  const cutoff = new Date(Date.now() - activeVitalsRange * 86400000);
  const recentVitals = (vitals || []).filter((v: any) => new Date(v.date) >= cutoff);

  const chartData = [...(gfr || [])].reverse().map((g: any) => ({
    date: new Date(g.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    MDRD: g.mdrd ? Math.round(g.mdrd) : null,
    'CKD-EPI': g.ckd_epi ? Math.round(g.ckd_epi) : null,
    CG: g.cg ? Math.round(g.cg) : null,
  }));

  const vitalsChart = [...recentVitals].reverse().map((v: any) => ({
    date: new Date(v.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    BP: v.systolic,
    Sugar: v.blood_sugar,
    Creatinine: v.creatinine ? +(v.creatinine * 10).toFixed(0) : null,
  }));

  const conditionTags = [
    patient.diabetes && { label: bn ? 'ডায়াবেটিস' : 'Diabetes', cls: 'bg-red-50 text-red-600 border-red-100' },
    patient.hypertension && { label: bn ? 'উচ্চ রক্তচাপ' : 'Hypertension', cls: 'bg-amber-50 text-amber-600 border-amber-100' },
    patient.arsenic_prone_area && { label: bn ? 'আর্সেনিক ঝুঁকি' : 'Arsenic Risk', cls: 'bg-purple-50 text-purple-600 border-purple-100' },
    patient.herbal_remedy_use && { label: bn ? 'ভেষজ ব্যবহার' : 'Herbal Remedies', cls: 'bg-orange-50 text-orange-600 border-orange-100' },
    patient.nsaid_use && { label: 'NSAID Use', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  ].filter(Boolean) as { label: string; cls: string }[];

  return (
    <div className="space-y-5 pb-36">

      {/* ── STICKY PATIENT HEADER ── */}
      <div className="sticky top-16 z-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-[#F4F7FB]/95 backdrop-blur py-2 border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-400 hover:text-[#1A6B8A] hover:bg-[#1A6B8A]/10 transition-all"
            title={bn ? 'ফিরুন' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-full bg-[#1A6B8A] text-white flex items-center justify-center font-black text-base shrink-0">
            {patient.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-sm truncate">{patient.name}</p>
            <p className="text-[11px] text-slate-400">{patient.district}{patient.age ? `, ${patient.age}y` : ''}{patient.sex ? ` · ${patient.sex}` : ''}</p>
          </div>
          {latestGfrVal && gfrStage && (
            <div className={`text-center px-3 py-1.5 rounded-xl ${gfrStage.bg} shrink-0`}>
              <p className={`text-base font-black leading-none ${gfrStage.color}`}>{latestGfrVal}</p>
              <p className={`text-[9px] font-bold uppercase ${gfrStage.color}`}>eGFR</p>
            </div>
          )}
          {patient.risk_score > 75 && (
            <span className="shrink-0 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black uppercase">
              {bn ? 'ক্রিটিক্যাল' : 'Critical'}
            </span>
          )}
        </div>
      </div>

      {/* ── PATIENT HEADER CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1A6B8A] text-white flex items-center justify-center text-2xl font-black shrink-0">
              {patient.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">{patient.name}</h1>
              <p className="text-sm text-slate-500">
                {patient.district}{patient.age ? `, ${patient.age}y` : ''}{patient.sex ? ` · ${patient.sex}` : ''}
              </p>
              {conditionTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {conditionTags.map(tag => (
                    <span key={tag.label} className={`px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase ${tag.cls}`}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Key stats */}
          <div className="flex flex-wrap items-center gap-4">
            {latestGfrVal && gfrStage && (
              <div className={`text-center px-4 py-2 rounded-2xl ${gfrStage.bg}`}>
                <p className={`text-2xl font-black ${gfrStage.color}`}>{latestGfrVal}</p>
                <p className={`text-[10px] font-bold uppercase ${gfrStage.color}`}>eGFR · Stage {gfrStage.stage}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-2xl font-black text-orange-500">{patient.risk_score || 0}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{bn ? 'ঝুঁকি স্কোর' : 'Risk Score'}</p>
            </div>
            {patient.uacr && (
              <div className="text-center">
                <p className="text-2xl font-black text-purple-600">{patient.uacr}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">UACR mg/g</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={startTeleconsult}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-500/20 min-h-[44px]"
          >
            <Video className="w-4 h-4" />
            {bn ? 'ভিডিও কল' : 'Start Teleconsult'}
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'prescriptions' }))}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1A6B8A] text-white rounded-xl text-sm font-bold hover:bg-[#14556e] transition-all shadow-sm shadow-[#1A6B8A]/20 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            {bn ? 'প্রেসক্রিপশন' : 'Issue Prescription'}
          </button>
        </div>
      </div>

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* GFR comparison */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm">
              <TrendingDown className="w-4 h-4 text-[#1A6B8A]" />
              {bn ? 'ইজিএফআর অগ্রগতি' : 'eGFR Progression'}
            </h3>
          </div>
          {chartData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="MDRD" stroke="#1A6B8A" strokeWidth={3} dot={{ r: 4, fill: '#1A6B8A', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="CKD-EPI" stroke="#7C3AED" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                  <Line type="monotone" dataKey="CG" stroke="#94A3B8" strokeWidth={2} strokeDasharray="2 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
              {bn ? 'কোনো জিএফআর ডেটা নেই' : 'No GFR data available'}
            </div>
          )}

          {/* Stage comparison strip */}
          {latestGfr && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { key: 'mdrd', label: 'MDRD', color: '#1A6B8A' },
                { key: 'ckd_epi', label: 'CKD-EPI', color: '#7C3AED' },
                { key: 'cg', label: 'CG', color: '#64748B' },
              ].map(m => {
                const val = latestGfr[m.key] ? Math.round(latestGfr[m.key]) : null;
                const s = val ? GFR_STAGE(val) : null;
                return (
                  <div key={m.key} className={`text-center p-2.5 rounded-xl ${s?.bg || 'bg-slate-50'}`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{m.label}</p>
                    <p className="text-lg font-black" style={{ color: m.color }}>{val ?? '--'}</p>
                    {s && <p className="text-[10px] font-bold" style={{ color: m.color }}>Stage {s.stage}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Vitals timeline */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-[#1A6B8A]" />
              {bn ? 'ভাইটালস টাইমলাইন' : 'Vitals Timeline'}
            </h3>
            <div className="flex gap-1">
              {([7, 30, 90] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setActiveVitalsRange(d)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    activeVitalsRange === d
                      ? 'bg-[#1A6B8A] text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {vitalsChart.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vitalsChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="BP" stroke="#E74C3C" strokeWidth={2.5} dot={{ r: 3, fill: '#E74C3C', strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="Sugar" stroke="#F39C12" strokeWidth={2.5} dot={{ r: 3, fill: '#F39C12', strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="Creatinine" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3, fill: '#7C3AED', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm flex-col gap-2">
              <Activity className="w-8 h-8 opacity-20" />
              {bn ? 'এই সময়কালে কোনো ভাইটালস নেই' : `No vitals in last ${activeVitalsRange} days`}
            </div>
          )}

          {/* Latest vitals log rows */}
          {(vitals || []).length > 0 && (
            <div className="mt-4 space-y-1.5 overflow-y-auto max-h-[120px]">
              {(vitals || []).slice(0, 5).map((v: any) => (
                <div key={v.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3 py-2">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(v.date).toLocaleDateString()}
                  </span>
                  <span className="font-bold text-slate-700">{v.systolic}/{v.diastolic} <span className="text-slate-400 font-normal">mmHg</span></span>
                  <span className="text-slate-600">{v.blood_sugar} <span className="text-slate-400">mg/dL</span></span>
                  {v.edema && <span className="text-red-500 font-bold">Edema</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── PRESCRIPTIONS ── */}
      {prescriptions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-[#1A6B8A]" />
              {bn ? 'সর্বশেষ প্রেসক্রিপশন' : 'Recent Prescriptions'}
            </h3>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'prescriptions' }))}
              className="text-xs font-bold text-[#1A6B8A] hover:underline"
            >
              {bn ? 'সব দেখুন →' : 'View all →'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prescriptions.slice(0, 4).map((rx: any) => (
              <div key={rx.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[11px] text-slate-400 mb-2">{new Date(rx.date).toLocaleDateString()}</p>
                <div className="space-y-1">
                  {(rx.medicines || []).slice(0, 3).map((m: any, i: number) => (
                    <p key={i} className="text-xs text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A6B8A] inline-block mr-1.5" />
                      {m.name} {m.dosage} — {m.frequency}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RISK FEEDBACK ── */}
      <motion.div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm mb-3">
          <MessageSquare className="w-4 h-4 text-[#1A6B8A]" />
          {bn ? 'ঝুঁকি স্কোর যাচাই' : 'Risk Score Validation'}
        </h3>
        {feedbackSent ? (
          <p className="text-emerald-600 font-semibold text-sm">
            ✓ {bn ? 'ফিডব্যাক পাঠানো হয়েছে। ধন্যবাদ।' : 'Feedback submitted. Thank you.'}
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              {bn
                ? `বর্তমান ঝুঁকি স্কোর ${patient.risk_score || 0}/100। এটি কি ক্লিনিক্যালি সঠিক?`
                : `Current risk score is ${patient.risk_score || 0}/100. Does this seem clinically accurate?`}
            </p>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20"
              rows={2}
              placeholder={bn ? 'ঐচ্ছিক মন্তব্য...' : 'Optional comment...'}
            />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => submitFeedback('too_high')}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 min-h-[44px]">
                <ThumbsDown className="w-4 h-4" /> {bn ? 'অনেক বেশি' : 'Too High'}
              </button>
              <button onClick={() => submitFeedback('correct')}
                className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 min-h-[44px]">
                <ThumbsUp className="w-4 h-4" /> {bn ? 'সঠিক' : 'Correct'}
              </button>
              <button onClick={() => submitFeedback('too_low')}
                className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 min-h-[44px]">
                <ThumbsUp className="w-4 h-4 rotate-180" /> {bn ? 'অনেক কম' : 'Too Low'}
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── FIXED BOTTOM ACTION BAR ── */}
      <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 pointer-events-none">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 p-3 flex gap-2 pointer-events-auto">
            <button
              onClick={startTeleconsult}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-sm min-h-[48px]"
            >
              <Video className="w-4 h-4 shrink-0" />
              <span className="truncate">{bn ? 'ভিডিও কল' : 'Teleconsult'}</span>
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'prescriptions' }))}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-[#1A6B8A] text-white rounded-xl text-sm font-bold hover:bg-[#14556e] transition-all shadow-sm min-h-[48px]"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate">{bn ? 'প্রেসক্রিপশন' : 'Issue Rx'}</span>
            </button>
            <button
              onClick={onBack}
              className="flex items-center justify-center gap-2 px-3 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all min-h-[48px]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
