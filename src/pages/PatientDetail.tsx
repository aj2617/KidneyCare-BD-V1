import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Activity, ArrowLeft, Calendar, TrendingDown, AlertCircle, Loader2, Video, FileText, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

export default function PatientDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/doctor/patient/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setIsLoading(false); if (d.prescriptions) setPrescriptions(d.prescriptions); });
  }, [id]);

  const startTeleconsult = () => {
    if (!data?.patient) return;
    window.dispatchEvent(new CustomEvent('navigate', {
      detail: {
        page: 'teleconsult',
        teleconsultPatient: { id: parseInt(id), name: data.patient.name }
      }
    }));
  };

  const submitFeedback = async (type: 'too_high' | 'too_low' | 'correct') => {
    await fetch('/api/doctor/risk-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ patient_id: parseInt(id), reported_score: data?.patient?.risk_score, feedback: type + (feedbackText ? `: ${feedbackText}` : '') }),
    });
    setFeedbackSent(true);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" /></div>;
  if (!data?.patient) return <div className="p-8 text-slate-500">Patient data not available.</div>;

  const { patient, vitals, gfr } = data;

  return (
    <div className="space-y-8">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-[#1A6B8A] font-bold transition-colors">
        <ArrowLeft className="w-5 h-5" />
        {language === 'bn' ? 'রোগীর তালিকায় ফিরুন' : 'Back to Patient List'}
      </button>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 text-3xl font-black">
            {patient.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{patient.name}</h1>
            <p className="text-slate-500 font-medium">{patient.district}, Bangladesh • {patient.age} years • {patient.sex}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {patient.diabetes && <span className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-md border border-red-100 uppercase">Diabetes</span>}
              {patient.hypertension && <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-md border border-amber-100 uppercase">Hypertension</span>}
              {patient.arsenic_prone_area ? <span className="px-2 py-1 bg-purple-50 text-purple-600 text-[10px] font-bold rounded-md border border-purple-100 uppercase">Arsenic Risk</span> : null}
              {patient.herbal_remedy_use ? <span className="px-2 py-1 bg-orange-50 text-orange-600 text-[10px] font-bold rounded-md border border-orange-100 uppercase">Herbal Remedies</span> : null}
              {patient.nsaid_use ? <span className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-md border border-slate-200 uppercase">NSAID Use</span> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-8 items-center">
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">CKD Stage</p>
            <p className="text-3xl font-black text-[#1A6B8A]">Stage {patient.ckd_stage || '--'}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Risk Score</p>
            <p className="text-3xl font-black text-orange-500">{patient.risk_score || 0}</p>
          </div>
          {patient.uacr && (
            <div className="text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">UACR</p>
              <p className="text-3xl font-black text-purple-600">{patient.uacr}</p>
              <p className="text-xs text-slate-400">mg/g</p>
            </div>
          )}
          <button onClick={startTeleconsult}
            className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30">
            <Video className="w-5 h-5" />
            {language === 'bn' ? 'ভিডিও কল' : 'Start Teleconsult'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-[#1A6B8A]" />
            eGFR Progression
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...gfr].reverse()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tickFormatter={v => new Date(v).toLocaleDateString()} hide />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="mdrd" stroke="#1A6B8A" strokeWidth={4} dot={{ r: 4 }} name="MDRD" />
                <Line type="monotone" dataKey="cg" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="CG" />
                <Line type="monotone" dataKey="ckd_epi" stroke="#7C3AED" strokeWidth={2} strokeDasharray="3 3" dot={false} name="CKD-EPI" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#1A6B8A]" />
            {language === 'bn' ? 'সর্বশেষ ভাইটালস' : 'Recent Vitals Log'}
          </h3>
          <div className="space-y-4">
            {vitals.slice(0, 5).map((v: any) => (
              <div key={v.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(v.date).toLocaleDateString()}
                  </div>
                  <div className="font-bold text-slate-900">{v.systolic}/{v.diastolic} <span className="text-[10px] font-normal text-slate-500">mmHg</span></div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center"><p className="font-bold text-slate-700">{v.blood_sugar}</p><p className="text-[10px] text-slate-400 uppercase font-bold">Sugar</p></div>
                  <div className="text-center"><p className="font-bold text-slate-700">{v.creatinine}</p><p className="text-[10px] text-slate-400 uppercase font-bold">Creat</p></div>
                  {v.edema ? <span className="text-xs text-red-500 font-bold self-center">Edema</span> : null}
                </div>
              </div>
            ))}
            {vitals.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No vitals logged yet.</p>}
          </div>
        </div>
      </div>

      {prescriptions.length > 0 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1A6B8A]" />
            {language === 'bn' ? 'সর্বশেষ প্রেসক্রিপশন' : 'Recent Prescriptions'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prescriptions.map(rx => (
              <div key={rx.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs text-slate-400">{new Date(rx.date).toLocaleDateString()}</p>
                <div className="mt-2 space-y-1">
                  {(rx.medicines || []).slice(0, 3).map((m: any, i: number) => (
                    <p key={i} className="text-sm text-slate-700">• {m.name} {m.dosage} — {m.frequency}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'prescriptions' }))}
            className="mt-4 text-sm font-bold text-[#1A6B8A] hover:underline">
            {language === 'bn' ? 'সব প্রেসক্রিপশন দেখুন →' : 'View all prescriptions →'}
          </button>
        </div>
      )}

      <motion.div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#1A6B8A]" />
          {language === 'bn' ? 'ঝুঁকি স্কোর যাচাইকরণ' : 'Risk Score Validation Feedback'}
        </h3>
        {feedbackSent ? (
          <p className="text-emerald-600 font-medium">✓ {language === 'bn' ? 'ফিডব্যাক পাঠানো হয়েছে। ধন্যবাদ।' : 'Feedback submitted. Thank you.'}</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              {language === 'bn'
                ? `বর্তমান ঝুঁকি স্কোর ${patient.risk_score || 0}/100। এটি কি ক্লিনিক্যালি সঠিক মনে হচ্ছে?`
                : `Current risk score is ${patient.risk_score || 0}/100. Does this seem clinically accurate?`}
            </p>
            <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" rows={2}
              placeholder={language === 'bn' ? 'ঐচ্ছিক মন্তব্য...' : 'Optional comment...'} />
            <div className="flex gap-3">
              <button onClick={() => submitFeedback('too_high')} className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50">
                <ThumbsDown className="w-4 h-4" /> {language === 'bn' ? 'অনেক বেশি' : 'Too High'}
              </button>
              <button onClick={() => submitFeedback('correct')} className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50">
                <ThumbsUp className="w-4 h-4" /> {language === 'bn' ? 'সঠিক' : 'Correct'}
              </button>
              <button onClick={() => submitFeedback('too_low')} className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50">
                <ThumbsUp className="w-4 h-4 rotate-180" /> {language === 'bn' ? 'অনেক কম' : 'Too Low'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
