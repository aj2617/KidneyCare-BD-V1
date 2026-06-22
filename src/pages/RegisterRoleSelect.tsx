import { motion } from 'motion/react';
import { Heart, Stethoscope, Users, ArrowRight, LogIn, Activity } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ROLES = [
  {
    value: 'patient',
    icon: Heart,
    color: '#1A6B8A',
    bg: '#EBF4F8',
    label: 'Patient',
    labelBn: 'রোগী',
    desc: 'Track your kidney health, log vitals, and get personalised risk scores.',
    descBn: 'আপনার কিডনির স্বাস্থ্য ট্র্যাক করুন, ভাইটালস লগ করুন এবং ব্যক্তিগতকৃত ঝুঁকির স্কোর পান।',
    page: 'register-patient',
  },
  {
    value: 'doctor',
    icon: Stethoscope,
    color: '#155E75',
    bg: '#ECFEFF',
    label: 'Doctor',
    labelBn: 'ডাক্তার',
    desc: 'Manage patients, receive clinical alerts, and consult via teleconsultation.',
    descBn: 'রোগীদের পরিচালনা করুন, ক্লিনিকাল সতর্কতা পান এবং টেলিকনসালটেশনের মাধ্যমে পরামর্শ দিন।',
    page: 'register-doctor',
  },
  {
    value: 'chw',
    icon: Users,
    color: '#166534',
    bg: '#F0FDF4',
    label: 'Community Health Worker',
    labelBn: 'কমিউনিটি স্বাস্থ্যকর্মী',
    desc: 'Register patients and log field visits — even without internet access.',
    descBn: 'রোগীদের নিবন্ধন করুন এবং মাঠ পরিদর্শন লগ করুন — ইন্টারনেট ছাড়াও।',
    page: 'register-chw',
  },
];

interface Props {
  onSelect: (page: string) => void;
  onLogin: () => void;
}

export default function RegisterRoleSelect({ onSelect, onLogin }: Props) {
  const { language } = useLanguage();
  const bn = language === 'bn';

  return (
    <div className="min-h-[80vh] flex items-start justify-center py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[480px]"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1A6B8A, #155E75)' }}
          >
            <Activity className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            {bn ? 'আপনি কে হিসেবে নিবন্ধন করছেন?' : 'Who are you registering as?'}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {bn ? 'আপনার ভূমিকা নির্বাচন করুন। প্রতিটি ভূমিকার নিজস্ব ড্যাশবোর্ড ও বৈশিষ্ট্য রয়েছে।'
              : 'Select your role. Each has its own dashboard and features.'}
          </p>
        </div>

        {/* Role cards */}
        <div className="space-y-3 mb-6">
          {ROLES.map((role, i) => {
            const Icon = role.icon;
            return (
              <motion.button
                key={role.value}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, duration: 0.25 }}
                onClick={() => onSelect(role.page)}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all text-left group"
              >
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: role.bg }}
                >
                  <Icon className="w-6 h-6" style={{ color: role.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm">
                    {bn ? role.labelBn : role.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    {bn ? role.descBn : role.desc}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
              </motion.button>
            );
          })}
        </div>

        {/* Sign in link */}
        <p className="text-center text-sm text-slate-500">
          {bn ? 'আগে থেকে অ্যাকাউন্ট আছে?' : 'Already have an account?'}{' '}
          <button
            onClick={onLogin}
            className="font-bold hover:underline"
            style={{ color: '#1A6B8A' }}
          >
            <LogIn className="inline w-3.5 h-3.5 mr-0.5 -mt-0.5" />
            {bn ? 'সাইন ইন করুন' : 'Sign in'}
          </button>
        </p>

        {/* Admin note */}
        <p className="text-center text-xs text-slate-400 mt-3">
          {bn
            ? 'অ্যাডমিন অ্যাকাউন্ট বিদ্যমান অ্যাডমিনদের দ্বারা তৈরি করা হয়।'
            : 'Admin accounts are created by existing admins only.'}
        </p>
      </motion.div>
    </div>
  );
}
