import { createContext, useContext, useState } from 'react';

type Language = 'en' | 'bn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'app.name': 'KidneyCare BD',
    'nav.dashboard': 'Dashboard',
    'nav.gfr': 'GFR Calculator',
    'nav.vitals': 'Vitals Log',
    'nav.education': 'Education',
    'nav.cost': 'Cost Planner',
    'nav.diet': 'Diet Assistant',
    'nav.caregiver': 'Caregiver',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'nav.chw_dashboard': 'CHW Dashboard',
    'nav.prescriptions': 'Prescriptions',
    'nav.teleconsult': 'Teleconsult',
    'nav.simulator': 'Budget Simulator',
    'nav.cohorts': 'Outcome Cohorts',
    'nav.fhir': 'FHIR / Interop',
    'dashboard.welcome': 'Welcome back',
    'dashboard.risk_score': 'CKD Risk Score',
    'dashboard.gfr_trend': 'eGFR Trend',
    'dashboard.streak': 'Day Logging Streak',
    'gfr.title': 'Smart GFR Calculator',
    'gfr.creatinine': 'Serum Creatinine (mg/dL)',
    'gfr.age': 'Age',
    'gfr.weight': 'Weight (kg)',
    'gfr.sex': 'Sex',
    'gfr.uacr': 'UACR (mg/g) — optional',
    'gfr.calculate': 'Calculate GFR',
    'vitals.title': 'Health Vitals Log',
    'vitals.bp': 'Blood Pressure',
    'vitals.sugar': 'Blood Sugar',
    'vitals.protein': 'Urine Protein',
    'vitals.log': 'Log Vitals',
    'vitals.streak': 'Keep your streak going! Log today.',
    'risk.low': 'Low Risk',
    'risk.moderate': 'Moderate Risk',
    'risk.high': 'High Risk',
    'risk.critical': 'Critical Risk',
    'edu.title': 'CKD Education Hub',
    'cost.title': 'Treatment Cost Estimator',
    'doctor.patients': 'My Patients',
    'doctor.alerts': 'Clinical Alerts',
    'doctor.prescriptions': 'Prescriptions',
    'doctor.teleconsult': 'Teleconsultation',
    'admin.heatmap': 'CKD Heatmap',
    'admin.reports': 'Policy Reports',
    'admin.simulator': 'Budget Simulator',
    'admin.cohorts': 'Outcome Cohorts',
    'chw.dashboard': 'CHW Dashboard',
    'streak.message_1': 'Great work! Keep logging daily.',
    'streak.message_5': 'Amazing! 5 days in a row!',
    'streak.message_10': 'Outstanding! 10-day streak!',
    'streak.message_30': 'Incredible! 30-day champion!',
    'offline.banner': 'You are offline. Data will sync when connected.',
    'offline.syncing': 'Syncing data...',
  },
  bn: {
    'app.name': 'কিডনিকেয়ার বিডি',
    'nav.dashboard': 'ড্যাশবোর্ড',
    'nav.gfr': 'জিএফআর ক্যালকুলেটর',
    'nav.vitals': 'ভাইটালস লগ',
    'nav.education': 'শিক্ষা',
    'nav.cost': 'খরচ পরিকল্পনা',
    'nav.diet': 'ডায়েট সহকারী',
    'nav.caregiver': 'পরিচর্যাকারী',
    'nav.login': 'লগইন',
    'nav.register': 'নিবন্ধন',
    'nav.chw_dashboard': 'সিএইচডব্লিউ ড্যাশবোর্ড',
    'nav.prescriptions': 'প্রেসক্রিপশন',
    'nav.teleconsult': 'টেলিকনসালটেশন',
    'nav.simulator': 'বাজেট সিমুলেটর',
    'nav.cohorts': 'ফলাফল দল',
    'nav.fhir': 'এফএইচআইআর / ইন্টারঅপ',
    'dashboard.welcome': 'স্বাগতম',
    'dashboard.risk_score': 'সিকেডি ঝুঁকির স্কোর',
    'dashboard.gfr_trend': 'ইজিএফআর ট্রেন্ড',
    'dashboard.streak': 'দৈনিক লগ স্ট্রিক',
    'gfr.title': 'স্মার্ট জিএফআর ক্যালকুলেটর',
    'gfr.creatinine': 'সিরাম ক্রিয়েটিনিন (mg/dL)',
    'gfr.age': 'বয়স',
    'gfr.weight': 'ওজন (কেজি)',
    'gfr.sex': 'লিঙ্গ',
    'gfr.uacr': 'ইউএসিআর (mg/g) — ঐচ্ছিক',
    'gfr.calculate': 'জিএফআর গণনা করুন',
    'vitals.title': 'স্বাস্থ্য ভাইটালস লগ',
    'vitals.bp': 'রক্তচাপ',
    'vitals.sugar': 'রক্তের শর্করা',
    'vitals.protein': 'প্রস্রাবে প্রোটিন',
    'vitals.log': 'ভাইটালস লগ করুন',
    'vitals.streak': 'আপনার স্ট্রিক চালু রাখুন! আজকে লগ করুন।',
    'risk.low': 'কম ঝুঁকি',
    'risk.moderate': 'মাঝারি ঝুঁকি',
    'risk.high': 'উচ্চ ঝুঁকি',
    'risk.critical': 'মারাত্মক ঝুঁকি',
    'edu.title': 'সিকেডি শিক্ষা কেন্দ্র',
    'cost.title': 'চিকিৎসা খরচ অনুমানকারী',
    'doctor.patients': 'আমার রোগী',
    'doctor.alerts': 'ক্লিনিকাল সতর্কতা',
    'doctor.prescriptions': 'প্রেসক্রিপশন',
    'doctor.teleconsult': 'টেলিকনসালটেশন',
    'admin.heatmap': 'সিকেডি হিটম্যাপ',
    'admin.reports': 'পলিসি রিপোর্ট',
    'admin.simulator': 'বাজেট সিমুলেটর',
    'admin.cohorts': 'ফলাফল দল',
    'chw.dashboard': 'সিএইচডব্লিউ ড্যাশবোর্ড',
    'streak.message_1': 'চমৎকার! প্রতিদিন লগ করতে থাকুন।',
    'streak.message_5': 'অসাধারণ! পরপর ৫ দিন!',
    'streak.message_10': 'অবিশ্বাস্য! ১০ দিনের স্ট্রিক!',
    'streak.message_30': 'অবিশ্বাস্য! ৩০ দিনের চ্যাম্পিয়ন!',
    'offline.banner': 'আপনি অফলাইনে আছেন। সংযুক্ত হলে ডেটা সিঙ্ক হবে।',
    'offline.syncing': 'ডেটা সিঙ্ক হচ্ছে...',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const t = (key: string) => translations[language][key] || key;
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
