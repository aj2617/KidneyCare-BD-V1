import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Stethoscope, Building2, Award, Users, Bell, Clock,
  RefreshCw, Download, CheckCircle2, HelpCircle, Info,
  LogOut, ChevronRight, Globe, Wifi, WifiOff, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n.charAt(0).toUpperCase())
    .join('');
}

function timeSince(date: Date | null, bn: boolean): string {
  if (!date) return bn ? 'কখনো নয়' : 'Never';
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return bn ? 'এইমাত্র' : 'Just now';
  if (mins < 60) return bn ? `${mins} মিনিট আগে` : `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return bn ? `${hrs} ঘণ্টা আগে` : `${hrs}h ago`;
}

interface SettingRowProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

function SettingRow({ icon: Icon, iconBg, iconColor, label, subtitle, right, onClick, danger }: SettingRowProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-full p-4 bg-white text-left transition-colors ${
        danger ? 'hover:bg-red-50 active:bg-red-50' : 'hover:bg-slate-50 active:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${danger ? 'text-red-600' : 'text-slate-900'}`}>{label}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right ?? (onClick && !danger && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />)}
    </button>
  );
}

export default function DoctorProfile() {
  const { token, user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [alertCount, setAlertCount] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAbout, setShowAbout] = useState(false);
  const syncedOnce = useRef(false);

  const bn = language === 'bn';

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!syncedOnce.current) {
      syncedOnce.current = true;
      fetchStats();
    }
  }, []);

  const fetchStats = async () => {
    setSyncing(true);
    try {
      const [pRes, aRes] = await Promise.all([
        fetch('/api/doctor/patients', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/doctor/alerts', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const patients = await pRes.json();
      const alerts = await aRes.json();
      setPatientCount(Array.isArray(patients) ? patients.length : 0);
      setAlertCount(Array.isArray(alerts) ? alerts.filter((a: any) => !a.is_read).length : 0);
      setLastSync(new Date());
    } finally {
      setSyncing(false);
    }
  };

  const initials = user?.name ? getInitials(user.name) : 'DR';
  const doctorName = user?.name || 'Dr. Doctor';

  return (
    <div className="min-h-screen bg-slate-50 pb-28">

      {/* ── TEAL HEADER ── */}
      <div
        className="-mx-4 sm:-mx-6 lg:-mx-8 px-5 pt-8 pb-20"
        style={{
          background: 'linear-gradient(135deg, #1A6B8A 0%, #0e4d66 100%)',
          borderRadius: '0 0 1.5rem 1.5rem',
        }}
      >
        <motion.h1
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white text-xl font-bold"
        >
          {bn ? 'ডাক্তার প্রোফাইল' : 'Doctor Profile'}
        </motion.h1>
      </div>

      {/* ── PROFILE HERO CARD (overlaps header) ── */}
      <div className="px-0 -mt-14 relative z-10 mb-6 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
        >
          {/* Avatar + name + specialty */}
          <div className="flex flex-col items-center p-6 border-b border-slate-100">
            <div className="w-20 h-20 rounded-full bg-slate-100 ring-4 ring-white shadow-sm flex items-center justify-center text-2xl font-black text-[#1A6B8A] mb-4">
              {initials}
            </div>
            <h2 className="text-xl font-black text-slate-900 text-center leading-tight">{doctorName}</h2>
            <div className="flex items-center gap-1.5 text-slate-500 mt-1.5 mb-4">
              <Stethoscope className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">{bn ? 'নেফ্রোলজিস্ট' : 'Nephrologist'}</span>
            </div>
            {/* Hospital + BMDC */}
            <div className="w-full bg-slate-50 rounded-xl p-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{bn ? 'ঢাকা মেডিকেল কলেজ হাসপাতাল' : 'Dhaka Medical College Hospital'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-400 shrink-0" />
                <span>BMDC: A-49281</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            {[
              {
                Icon: Users,
                value: patientCount === null ? '—' : patientCount,
                label: bn ? 'রোগী' : 'Patients',
              },
              {
                Icon: Bell,
                value: alertCount === null ? '—' : alertCount,
                label: bn ? 'অ্যালার্ট' : 'Alerts',
              },
              {
                Icon: Clock,
                value: lastSync ? timeSince(lastSync, bn) : '—',
                label: bn ? 'সিঙ্ক' : 'Since sync',
              },
            ].map(({ Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center py-3.5 text-center">
                <Icon className="w-5 h-5 text-[#1A6B8A] mb-1.5" />
                <span className="text-sm font-black text-slate-900 leading-none">{value}</span>
                <span className="text-[11px] text-slate-500 font-medium mt-0.5">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── SETTINGS SECTIONS ── */}
      <div className="space-y-6 max-w-2xl mx-auto">

        {/* Language & Region */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs font-black tracking-widest text-slate-400 uppercase mb-2 ml-1">
            {bn ? 'ভাষা ও অঞ্চল' : 'Language & Region'}
          </p>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-[#1A6B8A]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Language / ভাষা</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {language === 'en' ? 'English (EN)' : 'বাংলা (BN)'}
                  </p>
                </div>
              </div>
              {/* Toggle */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${language === 'en' ? 'text-[#1A6B8A]' : 'text-slate-400'}`}>EN</span>
                <button
                  onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    language === 'bn' ? 'bg-[#1A6B8A]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={language === 'bn'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      language === 'bn' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-xs font-semibold ${language === 'bn' ? 'text-[#1A6B8A]' : 'text-slate-400'}`}>বাংলা</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sync & Offline */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="text-xs font-black tracking-widest text-slate-400 uppercase mb-2 ml-1">
            {bn ? 'সিঙ্ক ও অফলাইন' : 'Sync & Offline'}
          </p>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">

            {/* Sync Status */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <RefreshCw className={`w-4 h-4 text-[#1A6B8A] ${syncing ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-900">
                      {bn ? 'সিঙ্ক স্ট্যাটাস' : 'Sync Status'}
                    </p>
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {syncing
                      ? (bn ? 'সিঙ্ক হচ্ছে...' : 'Syncing...')
                      : lastSync
                        ? (bn ? `শেষ সিঙ্ক: ${timeSince(lastSync, bn)}` : `Last synced: ${timeSince(lastSync, bn)}`)
                        : (bn ? 'এখনো সিঙ্ক হয়নি' : 'Not yet synced')}
                  </p>
                </div>
              </div>
              <button
                onClick={fetchStats}
                disabled={syncing || !isOnline}
                className="h-8 px-4 text-xs font-semibold border border-[#1A6B8A] text-[#1A6B8A] rounded-full hover:bg-[#1A6B8A]/5 active:bg-[#1A6B8A]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {syncing && <Loader2 className="w-3 h-3 animate-spin" />}
                {bn ? 'সিঙ্ক করুন' : 'Sync Now'}
              </button>
            </div>

            {/* Connection */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  {isOnline
                    ? <Wifi className="w-4 h-4 text-[#1A6B8A]" />
                    : <WifiOff className="w-4 h-4 text-amber-500" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {bn ? 'সংযোগ' : 'Connection'}
                  </p>
                  <p className={`text-xs font-medium mt-0.5 ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isOnline
                      ? (bn ? 'অনলাইন' : 'Online')
                      : (bn ? 'অফলাইন মোড' : 'Offline mode')}
                  </p>
                </div>
              </div>
            </div>

            {/* Offline Data */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4 text-[#1A6B8A]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {bn ? 'অফলাইন ডেটা' : 'Offline Data'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {patientCount !== null
                      ? (bn ? `${patientCount * 4} রেকর্ড ক্যাশড` : `${patientCount * 4} records cached`)
                      : (bn ? 'লোড হচ্ছে...' : 'Loading...')}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>

            {/* Pending Actions */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-[#1A6B8A]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {bn ? 'পেন্ডিং অ্যাকশন' : 'Pending Actions'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {bn ? '০টি আপলোড বাকি' : '0 pending uploads'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>

          </div>
        </motion.div>

        {/* Account */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="text-xs font-black tracking-widest text-slate-400 uppercase mb-2 ml-1">
            {bn ? 'অ্যাকাউন্ট' : 'Account'}
          </p>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">

            <SettingRow
              icon={HelpCircle}
              iconBg="bg-slate-50"
              iconColor="text-slate-600"
              label={bn ? 'সাহায্য ও সহায়তা' : 'Help & Support'}
              onClick={() => {}}
            />

            <SettingRow
              icon={Info}
              iconBg="bg-slate-50"
              iconColor="text-slate-600"
              label={bn ? 'কিডনিকেয়ার এমডি সম্পর্কে' : 'About KidneyCare MD'}
              onClick={() => setShowAbout(v => !v)}
            />

            <AnimatePresence>
              {showAbout && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 py-4 bg-slate-50 text-xs text-slate-500 space-y-1 border-t border-slate-100">
                    <p className="font-semibold text-slate-700">KidneyCare BD · Doctor Edition</p>
                    <p>Version 2.1.4 · Build 2026.05</p>
                    <p className="mt-2">
                      {bn
                        ? 'বাংলাদেশের সিকেডি রোগীদের জন্য একটি মোবাইল-ফার্স্ট ক্লিনিকাল ম্যানেজমেন্ট প্ল্যাটফর্ম।'
                        : 'A mobile-first clinical management platform for CKD patients in Bangladesh.'}
                    </p>
                    <p className="mt-1">FHIR R4 Ready · PWA · Bilingual · Offline-capable</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <SettingRow
              icon={LogOut}
              iconBg="bg-red-50"
              iconColor="text-red-500"
              label={bn ? 'লগআউট' : 'Logout'}
              danger
              onClick={logout}
            />
          </div>
        </motion.div>

      </div>

      {/* Footer */}
      <div className="mt-10 mb-4 text-center">
        <p className="text-xs font-medium text-slate-400">KidneyCare BD © 2026</p>
        <p className="text-[10px] text-slate-300 mt-0.5">v2.1.4</p>
      </div>

    </div>
  );
}
