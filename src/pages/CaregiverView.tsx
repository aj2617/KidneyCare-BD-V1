import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Heart, Phone, CheckCircle2, Loader2, User, Bell } from 'lucide-react';
import { motion } from 'motion/react';

export default function CaregiverView() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [currentCaregiver, setCurrentCaregiver] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { fetchCaregiver(); }, []);

  const fetchCaregiver = async () => {
    const res = await fetch('/api/patient/caregiver', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setCurrentCaregiver(data.caregiver_phone);
    setCaregiverPhone(data.caregiver_phone || '');
    setIsLoading(false);
  };

  const saveCaregiver = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await fetch('/api/patient/caregiver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ caregiver_phone: caregiverPhone }),
    });
    setIsSaving(false);
    if (res.ok) {
      setCurrentCaregiver(caregiverPhone);
      setMessage(language === 'bn' ? 'পরিচর্যাকারী সফলভাবে যুক্ত হয়েছেন!' : 'Caregiver linked successfully!');
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {language === 'bn' ? 'পারিবারিক পরিচর্যাকারী' : 'Family Caregiver View'}
        </h1>
        <p className="text-slate-500">
          {language === 'bn'
            ? 'একজন বিশ্বস্ত পরিবারের সদস্যকে সংযুক্ত করুন যিনি আপনার স্বাস্থ্য পর্যবেক্ষণে সাহায্য করবেন'
            : 'Link a trusted family member who will be notified if you miss logging vitals for 2+ days'}
        </p>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-medium text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> {message}
        </motion.div>
      )}

      {currentCaregiver && (
        <div className="bg-gradient-to-r from-[#1A6B8A] to-[#14556e] text-white p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <Heart className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold opacity-80">{language === 'bn' ? 'বর্তমান পরিচর্যাকারী' : 'Current Caregiver'}</p>
              <p className="text-2xl font-black">{currentCaregiver}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2 text-sm opacity-80">
            <Bell className="w-4 h-4" />
            {language === 'bn'
              ? '২ দিন ভাইটালস লগ না হলে এই নম্বরে সতর্কতা পাঠানো হবে'
              : 'Alert will be sent to this number if vitals are not logged for 2+ days'}
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <form onSubmit={saveCaregiver} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {language === 'bn' ? 'পরিচর্যাকারীর ফোন নম্বর' : "Caregiver's Phone Number"}
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="tel" value={caregiverPhone} onChange={e => setCaregiverPhone(e.target.value)}
                placeholder="+880 1X XX XXX XXX" required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A] text-lg" />
            </div>
            <p className="text-xs text-slate-400">
              {language === 'bn'
                ? 'বাংলাদেশি মোবাইল নম্বর (যেমন: 01712345678)'
                : 'Bangladeshi mobile number (e.g., 01712345678)'}
            </p>
          </div>

          <button type="submit" disabled={isSaving}
            className="w-full py-4 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#14556e] disabled:opacity-50">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" />}
            {currentCaregiver
              ? (language === 'bn' ? 'পরিচর্যাকারী আপডেট করুন' : 'Update Caregiver')
              : (language === 'bn' ? 'পরিচর্যাকারী যুক্ত করুন' : 'Link Caregiver')}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-slate-900">{language === 'bn' ? 'পরিচর্যাকারী কী পাবেন?' : 'What will the caregiver receive?'}</h2>
        {[
          {
            icon: Bell,
            title: language === 'bn' ? '২ দিন মিস করলে সতর্কতা' : '2-day miss alert',
            desc: language === 'bn' ? 'যদি আপনি ২ দিন ভাইটালস লগ না করেন, পরিচর্যাকারী একটি এসএমএস পাবেন।' : 'If you miss logging vitals for 2 consecutive days, caregiver gets an SMS.',
          },
          {
            icon: User,
            title: language === 'bn' ? 'সাপ্তাহিক স্বাস্থ্য সারসংক্ষেপ' : 'Weekly health summary',
            desc: language === 'bn' ? 'পরিচর্যাকারী প্রতি সপ্তাহে আপনার সর্বশেষ ভাইটালস ও ঝুঁকির স্কোর পাবেন।' : 'Caregiver receives your latest vitals and risk score weekly.',
          },
          {
            icon: Heart,
            title: language === 'bn' ? 'জরুরি সতর্কতা' : 'Emergency alerts',
            desc: language === 'bn' ? 'যদি আপনার রক্তচাপ বিপজ্জনকভাবে বেড়ে যায় তাহলে পরিচর্যাকারী তাৎক্ষণিক বার্তা পাবেন।' : 'Immediate notification if your BP becomes dangerously high.',
          },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 bg-[#1A6B8A]/10 rounded-xl flex items-center justify-center text-[#1A6B8A]">
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{item.title}</p>
              <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
