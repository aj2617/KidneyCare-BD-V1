import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ArrowRight, ArrowLeft, Activity, Heart, Calculator,
  BookOpen, Stethoscope, Bell, Video, FileText,
  Users, MapPin, WifiOff, Star, CheckCircle2, Pill,
  BarChart2, ShieldCheck
} from 'lucide-react';

interface Step {
  icon: React.ReactNode;
  color: string;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  action?: string;
  actionBn?: string;
  page?: string;
}

const PATIENT_STEPS: Step[] = [
  {
    icon: <Activity className="w-10 h-10" />,
    color: '#1A6B8A',
    title: 'Welcome to KidneyCare BD',
    titleBn: 'কিডনিকেয়ার বিডি-তে স্বাগতম',
    description: 'Your personal CKD monitoring hub. Track your kidney health, understand your risk, and get daily guidance — all in one place.',
    descriptionBn: 'আপনার ব্যক্তিগত সিকেডি পর্যবেক্ষণ কেন্দ্র। আপনার কিডনির স্বাস্থ্য ট্র্যাক করুন, ঝুঁকি বুঝুন এবং প্রতিদিনের নির্দেশনা পান।',
  },
  {
    icon: <Heart className="w-10 h-10" />,
    color: '#E74C3C',
    title: 'Log Your Vitals Daily',
    titleBn: 'প্রতিদিন ভাইটালস লগ করুন',
    description: 'Record your blood pressure, blood sugar, and weight every day. The app builds a streak to keep you motivated — even one log a day counts!',
    descriptionBn: 'প্রতিদিন আপনার রক্তচাপ, রক্তের শর্করা এবং ওজন রেকর্ড করুন। স্ট্রিক সিস্টেম আপনাকে অনুপ্রাণিত রাখবে।',
    action: 'Go to Vitals Log',
    actionBn: 'ভাইটালস লগে যান',
    page: 'vitals',
  },
  {
    icon: <Calculator className="w-10 h-10" />,
    color: '#1A6B8A',
    title: 'Calculate Your GFR',
    titleBn: 'আপনার জিএফআর গণনা করুন',
    description: 'Enter your latest creatinine test result to calculate your eGFR — the key number that tells you how well your kidneys are working.',
    descriptionBn: 'আপনার সর্বশেষ ক্রিয়েটিনিন পরীক্ষার ফলাফল দিয়ে আপনার ইজিএফআর গণনা করুন — এটি আপনার কিডনির কার্যকারিতা পরিমাপ করে।',
    action: 'Open GFR Calculator',
    actionBn: 'জিএফআর ক্যালকুলেটর খুলুন',
    page: 'gfr',
  },
  {
    icon: <Pill className="w-10 h-10" />,
    color: '#2ECC71',
    title: 'Track Your Medications',
    titleBn: 'আপনার ওষুধ ট্র্যাক করুন',
    description: 'Log your daily medications and set reminders so you never miss a dose. Medication adherence is critical for slowing CKD progression.',
    descriptionBn: 'আপনার দৈনিক ওষুধ লগ করুন এবং রিমাইন্ডার সেট করুন যাতে কোনো ডোজ মিস না হয়।',
    action: 'View Medications',
    actionBn: 'ওষুধ দেখুন',
    page: 'adherence',
  },
  {
    icon: <BookOpen className="w-10 h-10" />,
    color: '#9B59B6',
    title: 'Learn About CKD',
    titleBn: 'সিকেডি সম্পর্কে জানুন',
    description: 'Access patient education articles in both English and Bengali — covering diet, lifestyle, symptoms, and what to expect at each CKD stage.',
    descriptionBn: 'ইংরেজি এবং বাংলায় রোগী শিক্ষার নিবন্ধ পড়ুন — খাদ্য, জীবনধারা, লক্ষণ এবং প্রতিটি সিকেডি পর্যায়ে কী আশা করবেন।',
    action: 'Browse Education Hub',
    actionBn: 'শিক্ষা কেন্দ্রে যান',
    page: 'education',
  },
  {
    icon: <CheckCircle2 className="w-10 h-10" />,
    color: '#2ECC71',
    title: "You're All Set!",
    titleBn: 'আপনি প্রস্তুত!',
    description: "Start by logging today's vitals. Your dashboard will update with a personalised risk score as soon as you log your first reading.",
    descriptionBn: 'আজকের ভাইটালস লগ করে শুরু করুন। আপনার প্রথম রিডিং লগ করার সাথে সাথে ড্যাশবোর্ড ব্যক্তিগতকৃত ঝুঁকির স্কোর দেখাবে।',
    action: 'Log My First Vitals',
    actionBn: 'প্রথম ভাইটালস লগ করুন',
    page: 'vitals',
  },
];

const DOCTOR_STEPS: Step[] = [
  {
    icon: <Stethoscope className="w-10 h-10" />,
    color: '#1A6B8A',
    title: 'Welcome, Doctor',
    titleBn: 'স্বাগতম, ডাক্তার',
    description: "Your clinical command centre for CKD management in Bangladesh. Monitor patients, receive alerts, and consult remotely — all in one place.",
    descriptionBn: 'বাংলাদেশে সিকেডি ব্যবস্থাপনার জন্য আপনার ক্লিনিকাল কমান্ড সেন্টার। রোগীদের পর্যবেক্ষণ করুন, সতর্কতা পান এবং দূরবর্তীভাবে পরামর্শ করুন।',
  },
  {
    icon: <Users className="w-10 h-10" />,
    color: '#1A6B8A',
    title: 'Your Patient Panel',
    titleBn: 'আপনার রোগী তালিকা',
    description: 'View all your assigned patients with real-time risk scores, eGFR trends, and last-log dates. Search and filter to prioritise the most critical cases.',
    descriptionBn: 'রিয়েল-টাইম ঝুঁকির স্কোর, ইজিএফআর ট্রেন্ড সহ আপনার সমস্ত রোগী দেখুন। সবচেয়ে গুরুতর কেস অগ্রাধিকার দিন।',
    action: 'View Patients',
    actionBn: 'রোগী দেখুন',
    page: 'doctor-dashboard',
  },
  {
    icon: <Bell className="w-10 h-10" />,
    color: '#E74C3C',
    title: 'Clinical Alerts',
    titleBn: 'ক্লিনিকাল সতর্কতা',
    description: 'Get automatically notified when a patient\'s GFR drops by ≥5 points, vitals go critical, or a patient has not logged for 7+ days.',
    descriptionBn: 'রোগীর জিএফআর ৫+ পয়েন্ট কমলে, ভাইটালস সংকটজনক হলে বা ৭+ দিন লগ না করলে স্বয়ংক্রিয়ভাবে বিজ্ঞপ্তি পান।',
    action: 'Check Alerts',
    actionBn: 'সতর্কতা দেখুন',
    page: 'doctor-alerts',
  },
  {
    icon: <FileText className="w-10 h-10" />,
    color: '#F39C12',
    title: 'Prescriptions',
    titleBn: 'প্রেসক্রিপশন',
    description: 'Issue digital prescriptions directly to your patients. They receive them instantly in the app, with dosage instructions in both English and Bengali.',
    descriptionBn: 'সরাসরি রোগীদের ডিজিটাল প্রেসক্রিপশন দিন। তারা অ্যাপে তাৎক্ষণিকভাবে পান, ইংরেজি এবং বাংলায় ডোজের নির্দেশনা সহ।',
    action: 'Manage Prescriptions',
    actionBn: 'প্রেসক্রিপশন পরিচালনা',
    page: 'prescriptions',
  },
  {
    icon: <Video className="w-10 h-10" />,
    color: '#2ECC71',
    title: 'Teleconsultation',
    titleBn: 'টেলিকনসালটেশন',
    description: 'Launch a video consultation with any patient from their profile page. Share a secure one-click join link — no app install required for patients.',
    descriptionBn: 'যেকোনো রোগীর প্রোফাইল থেকে ভিডিও কনসালটেশন শুরু করুন। একটি নিরাপদ এক-ক্লিক জয়েন লিঙ্ক শেয়ার করুন।',
    action: 'Open Teleconsult',
    actionBn: 'টেলিকনসালটেশন খুলুন',
    page: 'teleconsult',
  },
  {
    icon: <CheckCircle2 className="w-10 h-10" />,
    color: '#2ECC71',
    title: "You're Ready!",
    titleBn: 'আপনি প্রস্তুত!',
    description: "Start by reviewing today's patient list and checking any pending clinical alerts. Your patients are waiting.",
    descriptionBn: 'আজকের রোগীর তালিকা পর্যালোচনা এবং যেকোনো মুলতুবি ক্লিনিকাল সতর্কতা পরীক্ষা করে শুরু করুন।',
    action: 'See My Patients',
    actionBn: 'আমার রোগী দেখুন',
    page: 'doctor-dashboard',
  },
];

const CHW_STEPS: Step[] = [
  {
    icon: <Users className="w-10 h-10" />,
    color: '#1A6B8A',
    title: 'Welcome, Health Worker',
    titleBn: 'স্বাগতম, স্বাস্থ্যকর্মী',
    description: "You're the frontline of kidney care in rural Bangladesh. KidneyCare BD helps you track visits, log vitals, and coordinate with doctors — even offline.",
    descriptionBn: 'গ্রামীণ বাংলাদেশে কিডনি যত্নের অগ্রভাগে আপনি। ভিজিট ট্র্যাক করুন, ভাইটালস লগ করুন এবং ডাক্তারদের সাথে সমন্বয় করুন।',
  },
  {
    icon: <Heart className="w-10 h-10" />,
    color: '#E74C3C',
    title: 'Your Patient List',
    titleBn: 'আপনার রোগীর তালিকা',
    description: 'See all patients assigned to you, sorted by urgency. Patients flagged as Overdue or High Risk need a visit today.',
    descriptionBn: 'জরুরিতার ভিত্তিতে সাজানো আপনার সমস্ত রোগী দেখুন। "অতিদেরি" বা "উচ্চ ঝুঁকি" হিসেবে চিহ্নিত রোগীদের আজই পরিদর্শন প্রয়োজন।',
    action: 'View Patients',
    actionBn: 'রোগী দেখুন',
    page: 'chw-home',
  },
  {
    icon: <MapPin className="w-10 h-10" />,
    color: '#F39C12',
    title: 'Log a Field Visit',
    titleBn: 'মাঠ পরিদর্শন লগ করুন',
    description: 'When you visit a patient, log their vitals and let the app capture your GPS location to verify the visit. Takes less than 2 minutes.',
    descriptionBn: 'রোগী পরিদর্শন করলে তাদের ভাইটালস লগ করুন এবং অ্যাপকে আপনার জিপিএস অবস্থান ক্যাপচার করতে দিন।',
    action: 'Log a Visit',
    actionBn: 'পরিদর্শন লগ করুন',
    page: 'chw-home',
  },
  {
    icon: <WifiOff className="w-10 h-10" />,
    color: '#9B59B6',
    title: 'Works Offline',
    titleBn: 'অফলাইনেও কাজ করে',
    description: "No signal? No problem. Log visits and vitals offline — they're stored on your device and automatically sync when you're back in range.",
    descriptionBn: 'সংকেত নেই? সমস্যা নেই। অফলাইনে ভিজিট এবং ভাইটালস লগ করুন — সেগুলি আপনার ডিভাইসে সংরক্ষিত হয় এবং রেঞ্জে ফিরলে স্বয়ংক্রিয়ভাবে সিঙ্ক হয়।',
  },
  {
    icon: <Star className="w-10 h-10" />,
    color: '#F39C12',
    title: 'Earn Points & Rank Up',
    titleBn: 'পয়েন্ট অর্জন করুন এবং র‍্যাঙ্ক বাড়ান',
    description: 'Every verified patient visit earns you 10 points. Compete on the leaderboard with other CHWs in your region. Top performers get recognised.',
    descriptionBn: 'প্রতিটি যাচাইকৃত রোগী পরিদর্শনে ১০ পয়েন্ট অর্জন করুন। আপনার অঞ্চলের অন্যান্য সিএইচডব্লিউর সাথে লিডারবোর্ডে প্রতিযোগিতা করুন।',
  },
  {
    icon: <CheckCircle2 className="w-10 h-10" />,
    color: '#2ECC71',
    title: "Ready to Make an Impact!",
    titleBn: 'প্রভাব ফেলতে প্রস্তুত!',
    description: 'Start with your patient list and plan today\'s visits. Every visit you log helps improve kidney care outcomes in your community.',
    descriptionBn: 'আপনার রোগীর তালিকা দিয়ে শুরু করুন এবং আজকের পরিদর্শন পরিকল্পনা করুন।',
    action: 'See My Patients',
    actionBn: 'আমার রোগী দেখুন',
    page: 'chw-home',
  },
];

const STEPS_BY_ROLE: Record<string, Step[]> = {
  patient: PATIENT_STEPS,
  doctor: DOCTOR_STEPS,
  chw: CHW_STEPS,
};

const STORAGE_KEY = (userId: number) => `onboarding_done_${userId}`;

interface Props {
  userId: number;
  role: string;
  language: string;
  onNavigate: (page: string) => void;
  forceShow?: boolean;
}

export default function OnboardingTour({ userId, role, language, onNavigate, forceShow }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  const steps = STEPS_BY_ROLE[role] || PATIENT_STEPS;
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const bn = language === 'bn';

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY(userId));
    if (!done || forceShow) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, [userId, forceShow]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY(userId), '1');
    setVisible(false);
  };

  const next = () => {
    if (isLast) { dismiss(); return; }
    setStep(s => s + 1);
  };

  const prev = () => setStep(s => Math.max(0, s - 1));

  const handleAction = () => {
    if (current.page) {
      onNavigate(current.page);
    }
    if (isLast) {
      dismiss();
    } else {
      next();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="onboarding-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Coloured top band */}
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${current.color}, #2ECC71)` }} />

            {/* Close button */}
            <div className="flex justify-between items-center px-5 pt-4 pb-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {bn ? 'পরিচিতি' : 'Getting Started'} · {step + 1}/{steps.length}
              </span>
              <button
                onClick={dismiss}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Icon */}
            <div className="flex justify-center pt-6 pb-4">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${current.color}ee, ${current.color}99)`,
                  boxShadow: `0 8px 24px ${current.color}40`,
                }}
              >
                {current.icon}
              </div>
            </div>

            {/* Text */}
            <div className="px-6 pb-5 text-center">
              <h2 className="text-xl font-black text-slate-900 mb-2">
                {bn ? current.titleBn : current.title}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                {bn ? current.descriptionBn : current.description}
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 pb-4">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === step ? 20 : 8,
                    height: 8,
                    background: i === step ? current.color : '#E2E8F0',
                  }}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="px-6 pb-6 space-y-2.5">
              {/* Primary action */}
              <button
                onClick={handleAction}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${current.color} 0%, ${current.color}cc 100%)`,
                  boxShadow: `0 4px 16px ${current.color}40`,
                }}
              >
                {isLast
                  ? (bn ? (current.actionBn || 'শুরু করুন!') : (current.action || "Let's go!"))
                  : (current.action
                    ? (bn ? current.actionBn : current.action)
                    : (bn ? 'পরবর্তী' : 'Next'))
                }
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Secondary row: Back + Skip */}
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    onClick={prev}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {bn ? 'পিছনে' : 'Back'}
                  </button>
                )}
                {!isLast && (
                  <button
                    onClick={dismiss}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {bn ? 'এড়িয়ে যান' : 'Skip tour'}
                  </button>
                )}
              </div>
            </div>

            {/* Trust line */}
            <div className="flex items-center justify-center gap-1.5 py-3 border-t border-slate-100">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2ECC71]" />
              <span className="text-xs text-slate-400">
                {bn ? 'আপনার ডেটা সুরক্ষিত' : 'Your data is private and encrypted'}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
