import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Activity, TrendingDown, AlertCircle, Calendar, ArrowUpRight, Flame, Utensils, Heart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

export default function PatientDashboard() {
  const { token, user } = useAuth();
  const { t, language } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [gfrHistory, setGfrHistory] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<{ score: number; factors: string[] }>({ score: 0, factors: [] });
  const [streak, setStreak] = useState(0);
  const isProfileIncomplete = Boolean(profile && (!profile.age || !profile.weight || !profile.sex));

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const [pRes, gRes, rRes, sRes] = await Promise.all([
      fetch('/api/patient/profile', { headers }),
      fetch('/api/patient/gfr-history', { headers }),
      fetch('/api/patient/risk-score', { headers }),
      fetch('/api/patient/streak', { headers }),
    ]);
    setProfile(await pRes.json());
    setGfrHistory(await gRes.json());
    setRiskData(await rRes.json());
    const sd = await sRes.json();
    setStreak(sd.streak || 0);
  };

  const getRiskColor = (score: number) => {
    if (score <= 25) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score <= 50) return 'text-amber-600 bg-amber-50 border-amber-100';
    if (score <= 75) return 'text-orange-600 bg-orange-50 border-orange-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  const getRiskLabel = (score: number) => {
    if (score <= 25) return t('risk.low');
    if (score <= 50) return t('risk.moderate');
    if (score <= 75) return t('risk.high');
    return t('risk.critical');
  };

  return (
    <div className="space-y-8">
      {isProfileIncomplete && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <motion.div animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.1, repeat: Infinity }}
              className="mt-1 h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_0_6px_rgba(245,158,11,0.18)]" />
            <div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-700" />
                <p className="text-sm font-bold text-amber-900">{language === 'bn' ? 'প্রোফাইল সম্পূর্ণ করুন' : 'Complete your profile'}</p>
              </div>
              <p className="text-sm font-medium text-amber-800 mt-1">
                {language === 'bn' ? 'সঠিক ঝুঁকি স্কোরের জন্য আপনার বয়স, লিঙ্গ এবং ওজন যোগ করুন।' : 'Add your age, sex, and weight for accurate risk scoring.'}
              </p>
            </div>
          </div>
          <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'profile' }))}
            className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors shrink-0">
            {language === 'bn' ? 'প্রোফাইল আপডেট করুন' : 'Complete Profile'}
          </button>
        </motion.div>
      )}

      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('dashboard.welcome')}, {user?.name}</h1>
          <p className="text-slate-500">
            {language === 'bn' ? 'আপনার কিডনি স্বাস্থ্যের সারসংক্ষেপ' : "Here's your kidney health overview"}
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-500">{language === 'bn' ? 'আপডেট হয়েছে' : 'Last updated'}</p>
          <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -4 }} className={`p-6 rounded-3xl border ${getRiskColor(riskData.score)} flex flex-col justify-between h-44`}>
          <div className="flex justify-between items-start">
            <div className="p-2 rounded-xl bg-white/50"><AlertCircle className="w-6 h-6" /></div>
            <span className="text-xs font-bold uppercase tracking-wider opacity-70">Live Risk Engine</span>
          </div>
          <div>
            <p className="text-4xl font-black">{riskData.score}/100</p>
            <p className="font-bold mt-1">{getRiskLabel(riskData.score)}</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border border-slate-200 bg-white flex flex-col justify-between h-44">
          <div className="flex justify-between items-start">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Activity className="w-6 h-6" /></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Latest eGFR</span>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-900">
              {gfrHistory.length > 0 ? Math.round(gfrHistory[gfrHistory.length - 1].mdrd) : '--'}
            </p>
            <p className="text-slate-500 font-medium mt-1">mL/min/1.73m²</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border border-slate-200 bg-white flex flex-col justify-between h-44">
          <div className="flex justify-between items-start">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><TrendingDown className="w-6 h-6" /></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CKD Stage</span>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-900">
              {language === 'bn' ? 'পর্যায় ' : 'Stage '}{gfrHistory.length > 0 ? gfrHistory[gfrHistory.length - 1].stage : '--'}
            </p>
            <p className="text-slate-500 font-medium mt-1">Chronic Kidney Disease</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }}
          onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'vitals' }))}
          className={`p-6 rounded-3xl border cursor-pointer flex flex-col justify-between h-44 ${streak >= 10 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-start">
            <div className={`p-2 rounded-xl ${streak >= 10 ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
              <Flame className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('dashboard.streak')}</span>
          </div>
          <div>
            <p className={`text-4xl font-black ${streak >= 10 ? 'text-amber-600' : 'text-slate-900'}`}>{streak}</p>
            <p className={`font-medium mt-1 ${streak >= 10 ? 'text-amber-500' : 'text-slate-500'}`}>
              {language === 'bn' ? 'দিন' : 'days'} {streak > 0 ? '🔥' : ''}
            </p>
          </div>
        </motion.div>
      </div>

      {riskData.factors && riskData.factors.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">
            {language === 'bn' ? 'ঝুঁকির কারণসমূহ' : 'Active Risk Factors'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {riskData.factors.map((f, i) => (
              <span key={i} className="px-3 py-1.5 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-full">{f}</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-900">{t('dashboard.gfr_trend')}</h3>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              {language === 'bn' ? 'সর্বশেষ ৬ মাস' : 'Last 6 Months'}
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gfrHistory.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tickFormatter={val => new Date(val).toLocaleDateString(undefined, { month: 'short' })} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="mdrd" stroke="#1A6B8A" strokeWidth={4} dot={{ r: 6, fill: '#1A6B8A', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} name="MDRD GFR" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-8 bg-slate-900 text-white rounded-3xl">
            <h3 className="text-xl font-bold mb-4">{language === 'bn' ? 'ক্লিনিকাল পরামর্শ' : 'Clinical Recommendation'}</h3>
            <p className="text-slate-300 mb-6 leading-relaxed">
              {gfrHistory.length > 0 ? gfrHistory[gfrHistory.length - 1].recommendation : (language === 'bn' ? 'ব্যক্তিগতকৃত পরামর্শের জন্য প্রথম জিএফআর গণনা করুন।' : 'Complete your first GFR calculation for personalized recommendations.')}
            </p>
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'education' }))}
              className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all">
              {language === 'bn' ? 'অ্যাকশন প্ল্যান দেখুন' : 'View Action Plan'}<ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'diet' }))}
              className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl hover:bg-emerald-100 transition-all flex flex-col items-center gap-2">
              <Utensils className="w-8 h-8 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">{language === 'bn' ? 'ডায়েট সহকারী' : 'Diet Assistant'}</span>
            </button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'caregiver' }))}
              className="p-5 bg-pink-50 border border-pink-200 rounded-2xl hover:bg-pink-100 transition-all flex flex-col items-center gap-2">
              <Heart className="w-8 h-8 text-pink-600" />
              <span className="text-sm font-bold text-pink-700">{language === 'bn' ? 'পরিচর্যাকারী' : 'Caregiver'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
