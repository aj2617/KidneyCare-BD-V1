import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import {
  Activity, Calculator, BookOpen, DollarSign, LayoutDashboard,
  Users, Map as MapIcon, Bell, LogOut, Menu, X, Globe, User,
  Utensils, Heart, Video, FileText, BarChart2, Wifi, WifiOff, Cpu, Pill, Download,
  ClipboardList, Wrench, UserCircle, Shield, Settings, Star, CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import PWAInstallPrompt from './components/PWAInstallPrompt';
import VitalsReminder from './components/VitalsReminder';
import OnboardingTour from './components/OnboardingTour';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterRoleSelect from './pages/RegisterRoleSelect';
import PatientDashboard from './pages/PatientDashboard';
import GfrCalculator from './pages/GfrCalculator';
import VitalsLog from './pages/VitalsLog';
import Education from './pages/Education';
import CostPlanner from './pages/CostPlanner';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorAlerts from './pages/DoctorAlerts';
import PatientDetail from './pages/PatientDetail';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import CHWDashboard from './pages/CHWDashboard';
import Prescriptions from './pages/Prescriptions';
import Teleconsult from './pages/Teleconsult';
import DietAssistant from './pages/DietAssistant';
import CaregiverView from './pages/CaregiverView';
import BudgetSimulator from './pages/BudgetSimulator';
import OutcomeCohorts from './pages/OutcomeCohorts';
import FHIRViewer from './pages/FHIRViewer';
import MedicationAdherence from './pages/MedicationAdherence';
import DoctorToday from './pages/DoctorToday';
import DoctorProfile from './pages/DoctorProfile';
import DoctorTools from './pages/DoctorTools';
import JoinCall from './pages/JoinCall';

export default function App() {
  const { user, logout, token } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [currentPage, setCurrentPage] = useState('landing');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [teleconsultPatient, setTeleconsultPatient] = useState<{ id: number; name: string } | null>(null);
  const [selectedDoctorPatient, setSelectedDoctorPatient] = useState<{ id: number; name?: string } | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [pwaPromptRequested, setPwaPromptRequested] = useState(false);
  const openPwaPrompt = () => setPwaPromptRequested(true);

  // Detect ?join=TOKEN in URL — show public join page immediately
  const joinToken = new URLSearchParams(window.location.search).get('join');
  if (joinToken) {
    return <JoinCall joinToken={joinToken} />;
  }

  useEffect(() => {
    const handleNavigate = (e: any) => {
      if (e.detail?.page) {
        setCurrentPage(e.detail.page);
        if (e.detail.selectedPatient) setSelectedDoctorPatient(e.detail.selectedPatient);
        if (e.detail.teleconsultPatient) setTeleconsultPatient(e.detail.teleconsultPatient);
        if (e.detail.teleconsultPatient) setSelectedDoctorPatient(e.detail.teleconsultPatient);
      } else {
        setCurrentPage(e.detail);
      }
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  useEffect(() => {
    setSelectedDoctorPatient(null);
    setTeleconsultPatient(null);

    if (user) {
      if (user.role === 'patient') setCurrentPage('dashboard');
      else if (user.role === 'doctor') setCurrentPage('doctor-dashboard');
      else if (user.role === 'admin') setCurrentPage('admin-overview');
      else if (user.role === 'chw') setCurrentPage('chw-home');
    } else {
      setCurrentPage('landing');
    }
  }, [user]);

  useEffect(() => {
    const handlePwaPrompt: EventListener = () => setPwaPromptRequested(true);
    window.addEventListener('kcbd-open-pwa-prompt', handlePwaPrompt);
    return () => window.removeEventListener('kcbd-open-pwa-prompt', handlePwaPrompt);
  }, []);

  // Online/offline detection
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

  // Register service worker + handle updates
  const [swUpdateReady, setSwUpdateReady] = useState(false);
  const [swReg, setSwReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      setSwReg(reg);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setSwUpdateReady(true);
          }
        });
      });
    }).catch(console.error);
  }, []);

  const applySwUpdate = () => {
    if (swReg?.waiting) {
      swReg.waiting.postMessage('SKIP_WAITING');
      setSwUpdateReady(false);
      window.location.reload();
    }
  };

  const navItems: Record<string, Array<{ id: string; label: string; icon: any }>> = {
    patient: [
      { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
      { id: 'gfr', label: t('nav.gfr'), icon: Calculator },
      { id: 'vitals', label: t('nav.vitals'), icon: Activity },
      { id: 'adherence', label: t('nav.adherence'), icon: Pill },
      { id: 'diet', label: t('nav.diet'), icon: Utensils },
      { id: 'education', label: t('nav.education'), icon: BookOpen },
      { id: 'cost', label: t('nav.cost'), icon: DollarSign },
      { id: 'caregiver', label: t('nav.caregiver'), icon: Heart },
      { id: 'profile', label: 'Profile', icon: User },
    ],
    doctor: [
      { id: 'doctor-dashboard', label: t('doctor.patients'), icon: Users },
      { id: 'doctor-alerts', label: t('doctor.alerts'), icon: Bell },
      { id: 'prescriptions', label: t('doctor.prescriptions'), icon: FileText },
      { id: 'teleconsult', label: t('doctor.teleconsult'), icon: Video },
    ],
    admin: [
      { id: 'admin-overview', label: language === 'bn' ? 'সারসংক্ষেপ' : 'Overview', icon: LayoutDashboard },
      { id: 'admin-map', label: language === 'bn' ? 'মানচিত্র' : 'CKD Map', icon: MapIcon },
      { id: 'admin-reports', label: language === 'bn' ? 'রিপোর্ট' : 'Reports', icon: FileText },
      { id: 'admin-simulator', label: language === 'bn' ? 'সিমুলেটর' : 'Simulator', icon: BarChart2 },
      { id: 'admin-cohorts', label: language === 'bn' ? 'কোহর্ট' : 'Cohorts', icon: Users },
      { id: 'admin-users', label: language === 'bn' ? 'ব্যবহারকারী' : 'Users', icon: Shield },
    ],
    chw: [
      { id: 'chw-home', label: t('chw.dashboard'), icon: Users },
    ],
  };

  const renderPage = () => {
    if (currentPage === 'landing') return <Landing onStart={() => setCurrentPage('register')} onLogin={() => setCurrentPage('login')} />;
    if (currentPage === 'login') return <Login onRegister={() => setCurrentPage('register')} registeredSuccess={registeredSuccess} onClearSuccess={() => setRegisteredSuccess(false)} />;
    if (currentPage === 'register') return <RegisterRoleSelect onSelect={(page) => setCurrentPage(page)} onLogin={() => setCurrentPage('login')} />;
    if (currentPage === 'register-patient') return <Register role="patient" onLogin={(ok) => { if (ok) setRegisteredSuccess(true); setCurrentPage('login'); }} onBack={() => setCurrentPage('register')} />;
    if (currentPage === 'register-doctor') return <Register role="doctor" onLogin={(ok) => { if (ok) setRegisteredSuccess(true); setCurrentPage('login'); }} onBack={() => setCurrentPage('register')} />;
    if (currentPage === 'register-chw') return <Register role="chw" onLogin={(ok) => { if (ok) setRegisteredSuccess(true); setCurrentPage('login'); }} onBack={() => setCurrentPage('register')} />;

    if (user?.role === 'patient') {
      switch (currentPage) {
        case 'dashboard': return <PatientDashboard />;
        case 'gfr': return <GfrCalculator />;
        case 'vitals': return <VitalsLog />;
        case 'diet': return <DietAssistant />;
        case 'education': return <Education />;
        case 'cost': return <CostPlanner />;
        case 'adherence': return <MedicationAdherence />;
        case 'caregiver': return <CaregiverView />;
        case 'profile': return <Profile />;
      }
    }

    if (user?.role === 'doctor') {
      const openDoctorPatient = (patient: { id: number; name?: string }) => {
        setSelectedDoctorPatient(patient);
        setCurrentPage(`patient-${patient.id}`);
      };
      if (currentPage === 'doctor-dashboard') return <DoctorDashboard onSelectPatient={openDoctorPatient} />;
      if (currentPage === 'doctor-alerts') return <DoctorAlerts />;
      if (currentPage === 'doctor-today') return <DoctorToday onSelectPatient={openDoctorPatient} />;
      if (currentPage === 'doctor-tools') return <DoctorTools />;
      if (currentPage === 'prescriptions') return <Prescriptions selectedPatient={selectedDoctorPatient} />;
      if (currentPage === 'gfr') return <GfrCalculator />;
      if (currentPage === 'teleconsult') return <Teleconsult patientId={teleconsultPatient?.id ?? selectedDoctorPatient?.id} patientName={teleconsultPatient?.name ?? selectedDoctorPatient?.name} onEnd={() => setCurrentPage('doctor-dashboard')} />;
      if (currentPage.startsWith('patient-')) return <PatientDetail id={currentPage.split('-')[1]} onBack={() => setCurrentPage('doctor-dashboard')} />;
      if (currentPage === 'doctor-profile') return <DoctorProfile />;
    }

    if (user?.role === 'admin') {
      const adminTabMap: Record<string, string> = {
        'admin-overview': 'overview',
        'admin-dashboard': 'overview',
        'admin-map': 'map',
        'admin-reports': 'reports',
        'admin-simulator': 'simulator',
        'admin-cohorts': 'cohorts',
        'admin-users': 'users',
      };
      const adminTab = adminTabMap[currentPage] || 'overview';
      return <AdminDashboard initialTab={adminTab as any} />;
    }

    if (user?.role === 'chw') {
      return <CHWDashboard tab={currentPage} />;
    }

    return <div className="p-8 text-slate-500">Page under construction: {currentPage}</div>;
  };

  const role = user?.role as string;
  const currentNavItems = navItems[role] || [];

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#1E293B] font-sans overflow-x-hidden">
      {/* Offline Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="text-white text-sm font-semibold text-center py-2 flex items-center justify-center gap-2 z-[100]" style={{ background: '#F39C12' }}
          >
            <WifiOff className="w-4 h-4" />
            {t('offline.banner')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SW Update Banner */}
      <AnimatePresence>
        {swUpdateReady && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#1A6B8A] text-white text-sm font-semibold text-center py-2 flex items-center justify-center gap-3 z-[100]"
          >
            <span>{language === 'bn' ? 'নতুন আপডেট পাওয়া গেছে।' : 'A new version is available.'}</span>
            <button
              onClick={applySwUpdate}
              className="px-3 py-1 bg-white text-[#1A6B8A] rounded-lg text-xs font-black hover:bg-slate-100 transition-colors"
            >
              {language === 'bn' ? 'আপডেট করুন' : 'Refresh'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {user ? (
        <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur shadow-[0_1px_0_rgba(15,23,42,0.03)]">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Brand */}
              <button
                onClick={() => setCurrentPage(user.role === 'patient' ? 'dashboard' : currentNavItems[0]?.id || 'landing')}
                className="flex items-center gap-2.5 min-w-0 shrink-0 group"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#1A6B8A] text-white flex items-center justify-center shadow-lg shadow-[#1A6B8A]/15 shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="min-w-0 text-left block">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 leading-none">
                    KidneyCare BD
                  </p>
                  <p className="text-[13px] sm:text-[15px] font-black text-slate-900 leading-tight">
                    {user.role === 'patient' ? (language === 'bn' ? 'রোগী প্যানেল' : 'Patient Panel') : t('app.name')}
                  </p>
                </div>
              </button>

              {/* Compact utilities */}
              <div className="ml-auto hidden lg:flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap" style={{ color: isOnline ? '#2ECC71' : '#F39C12' }}>
                    {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                    <span>{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                  <button
                    onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-600 hover:text-[#1A6B8A] hover:bg-white transition-colors text-xs font-semibold"
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === 'en' ? 'বাংলা' : 'EN'}</span>
                  </button>
                </div>

                {user?.role === 'patient' && (
                  <div className="rounded-2xl border border-slate-200 bg-white px-2 py-1 shadow-sm">
                    <VitalsReminder language={language as 'en' | 'bn'} token={token} />
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-[#1A6B8A]/10 border border-[#1A6B8A]/20 flex items-center justify-center text-[#1A6B8A] text-xs font-black shrink-0">
                    {user.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 leading-tight truncate max-w-[180px]">
                      {user.name.split(' ')[0]}{user.name.split(' ').length > 1 ? ' ' + user.name.split(' ').slice(1).join(' ') : ''}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold leading-tight">{user.role}</p>
                  </div>
                  <button onClick={logout} className="ml-1 p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 shrink-0" title="Logout">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mobile actions */}
              <div className="lg:hidden flex items-center gap-1.5 shrink-0 ml-auto">
                <div className="w-7 h-7 rounded-full bg-[#1A6B8A]/10 border border-[#1A6B8A]/20 flex items-center justify-center text-[#1A6B8A] text-[10px] font-black shrink-0">
                  {user.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Desktop nav rail */}
            <div className="hidden lg:block mt-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-1 shadow-sm overflow-x-auto no-scrollbar">
                <div className="flex min-w-max items-center gap-1">
                  {currentNavItems.map((item) => {
                    const active = currentPage === item.id || currentPage.startsWith(item.id + '-');
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                          active
                            ? 'bg-white text-[#1A6B8A] shadow-sm ring-1 ring-[#1A6B8A]/10'
                            : 'text-slate-600 hover:bg-white hover:text-slate-900'
                        }`}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile dropdown menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="lg:hidden bg-white border-t border-slate-100 overflow-hidden"
              >
                <div className="px-3 pt-2 pb-3 space-y-0.5">
                  {/* User info row at top of menu */}
                  <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl bg-slate-50">
                    <div className="w-9 h-9 rounded-full bg-[#1A6B8A] flex items-center justify-center text-white text-sm font-black shrink-0">
                      {user.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 uppercase font-semibold">{user.role}</p>
                    </div>
                  </div>
                  {currentNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setCurrentPage(item.id); setIsMobileMenuOpen(false); }}
                      className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        currentPage === item.id ? 'bg-[#1A6B8A]/10 text-[#1A6B8A]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </button>
                  ))}
                  <div className="pt-1 border-t border-slate-100 mt-1">
                    <button
                      onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                      className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      Logout
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      ) : (
        <nav className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="min-h-[72px] flex items-center justify-between gap-3">
              <button onClick={() => setCurrentPage('landing')} className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-[#1A6B8A] text-white flex items-center justify-center text-xl sm:text-2xl font-black shadow-lg shadow-[#1A6B8A]/20 shrink-0">K</div>
                <span className="max-w-[92px] text-[14px] sm:max-w-none sm:text-[18px] md:text-[20px] font-black text-[#1A6B8A] leading-tight text-left">
                  {t('app.name')}
                </span>
              </button>
              <div className="hidden md:flex items-center gap-4">
                <div className="h-7 w-px bg-slate-200" />
                <button onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                  className="px-3 py-2 text-slate-600 hover:text-[#1A6B8A] transition-colors flex items-center gap-2 text-sm font-medium">
                  <Globe className="w-4 h-4" />
                  {language === 'en' ? 'বাংলা' : 'English'}
                </button>
                <button onClick={() => setCurrentPage('login')} className="px-4 py-2 text-[#1A6B8A] font-bold hover:text-[#14556e] transition-colors whitespace-nowrap shrink-0">Login</button>
                <button onClick={() => setCurrentPage('register')} className="px-5 py-2.5 rounded-2xl bg-[#1A6B8A] text-white font-bold shadow-lg shadow-[#1A6B8A]/20 hover:bg-[#14556e] transition-all whitespace-nowrap shrink-0">Register</button>
              </div>
              <div className="md:hidden flex items-center gap-1 shrink-0 flex-nowrap">
                <button
                  onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:text-[#1A6B8A] hover:bg-slate-100 transition-colors shrink-0"
                  aria-label="Change language"
                >
                  <Globe className="w-5 h-5" />
                </button>
                <button onClick={() => setCurrentPage('login')} className="px-2.5 py-2 text-[11px] font-bold leading-none text-[#1A6B8A] whitespace-nowrap shrink-0">
                  Login
                </button>
                <button onClick={() => setCurrentPage('register')} className="px-2.5 py-2 rounded-xl bg-[#1A6B8A] text-white text-[11px] font-bold leading-none whitespace-nowrap shrink-0">
                  Register
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={`max-w-7xl mx-auto ${
        user?.role === 'chw'
          ? 'px-0 py-0 pb-24'
          : user?.role === 'patient'
          ? 'px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8'
          : user?.role === 'doctor'
          ? 'px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8'
          : user?.role === 'admin'
          ? 'px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8'
          : 'px-4 sm:px-6 lg:px-8 py-6 sm:py-8'
      }`}>
        <motion.div key={currentPage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
          {renderPage()}
        </motion.div>
      </main>

      {/* Mobile bottom nav — patients only */}
      {user?.role === 'patient' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-100 z-50 safe-area-inset-bottom">
          <div className="flex items-stretch px-1">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: language === 'bn' ? 'হোম' : 'Home' },
              { id: 'vitals', icon: Activity, label: language === 'bn' ? 'ভাইটালস' : 'Vitals' },
              { id: 'gfr', icon: Calculator, label: language === 'bn' ? 'ক্যালক' : 'Calc' },
              { id: 'education', icon: BookOpen, label: language === 'bn' ? 'শিক্ষা' : 'Learn' },
              { id: 'profile', icon: User, label: language === 'bn' ? 'প্রোফাইল' : 'Profile' },
            ].map(item => {
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 min-h-[60px] transition-all relative"
                >
                  <div className={`p-1.5 rounded-2xl transition-all ${active ? 'bg-[#1A6B8A]/10' : ''}`}>
                    <item.icon className={`w-5 h-5 transition-colors ${active ? 'text-[#1A6B8A]' : 'text-slate-400'}`} />
                  </div>
                  <span className={`text-[10px] font-bold leading-none transition-colors ${active ? 'text-[#1A6B8A]' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#1A6B8A]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Bottom nav — doctors (mobile only, hidden on md+) */}
      {user?.role === 'doctor' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 z-50 safe-area-inset-bottom">
          <div className="flex items-stretch px-1 max-w-2xl mx-auto">
            {[
              { id: 'doctor-dashboard', icon: Users, label: language === 'bn' ? 'রোগী' : 'Patients' },
              { id: 'doctor-alerts', icon: Bell, label: language === 'bn' ? 'অ্যালার্ট' : 'Alerts' },
              { id: 'doctor-today', icon: ClipboardList, label: language === 'bn' ? 'আজকের' : 'Today' },
              { id: 'doctor-tools', icon: Wrench, label: language === 'bn' ? 'টুলস' : 'Tools' },
              { id: 'doctor-profile', icon: UserCircle, label: language === 'bn' ? 'প্রোফাইল' : 'Profile' },
            ].map(item => {
              const active = currentPage === item.id
                || (item.id === 'doctor-dashboard' && currentPage.startsWith('patient-'))
                || (item.id === 'doctor-tools' && currentPage === 'prescriptions')
                || (item.id === 'doctor-profile' && currentPage === 'profile');
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 min-h-[60px] transition-all relative"
                >
                  <div className={`p-1.5 rounded-2xl transition-all ${active ? 'bg-[#1A6B8A]/10' : ''}`}>
                    <item.icon className={`w-5 h-5 transition-colors ${active ? 'text-[#1A6B8A]' : 'text-slate-400'}`} />
                  </div>
                  <span className={`text-[10px] font-bold leading-none transition-colors ${active ? 'text-[#1A6B8A]' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="doctorNavIndicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#1A6B8A]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Bottom nav — admin (mobile only) */}
      {user?.role === 'admin' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 z-50 safe-area-inset-bottom">
          <div className="flex items-stretch px-1">
            {[
              { id: 'admin-overview', icon: LayoutDashboard, label: language === 'bn' ? 'সারসংক্ষেপ' : 'Overview' },
              { id: 'admin-map', icon: MapIcon, label: language === 'bn' ? 'মানচিত্র' : 'Map' },
              { id: 'admin-reports', icon: FileText, label: language === 'bn' ? 'রিপোর্ট' : 'Reports' },
              { id: 'admin-simulator', icon: Calculator, label: language === 'bn' ? 'সিমুলেটর' : 'Sim' },
              { id: 'admin-users', icon: Shield, label: language === 'bn' ? 'ব্যবহারকারী' : 'Users' },
            ].map(item => {
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 min-h-[60px] transition-all relative"
                >
                  <div className={`p-1.5 rounded-2xl transition-all ${active ? 'bg-[#1A6B8A]/10' : ''}`}>
                    <item.icon className={`w-5 h-5 transition-colors ${active ? 'text-[#1A6B8A]' : 'text-slate-400'}`} />
                  </div>
                  <span className={`text-[10px] font-bold leading-none transition-colors ${active ? 'text-[#1A6B8A]' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="adminNavIndicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#1A6B8A]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Bottom nav — CHW (always visible, full width) */}
      {user?.role === 'chw' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-100 z-50 safe-area-inset-bottom shadow-lg">
          <div className="flex items-stretch">
            {[
              { id: 'chw-home', icon: Users, en: 'My Patients', bn: 'রোগীরা' },
              { id: 'chw-vitals', icon: Activity, en: 'Log Visit', bn: 'ভিজিট' },
              { id: 'chw-schedule', icon: CalendarDays, en: 'Schedule', bn: 'সময়সূচী' },
              { id: 'chw-points', icon: Star, en: 'My Points', bn: 'পয়েন্ট' },
              { id: 'chw-settings', icon: Settings, en: 'Settings', bn: 'সেটিংস' },
            ].map(item => {
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className="flex-1 flex flex-col items-center justify-center py-3 gap-1 min-h-[64px] relative transition-colors"
                >
                  <div className={`p-1.5 rounded-2xl transition-all ${active ? 'bg-[#1A6B8A]/10' : ''}`}>
                    <item.icon className={`w-6 h-6 transition-colors ${active ? 'text-[#1A6B8A]' : 'text-slate-400'}`} />
                  </div>
                  <span className={`text-[10px] font-bold leading-none transition-colors ${active ? 'text-[#1A6B8A]' : 'text-slate-400'}`}>
                    {language === 'bn' ? item.bn : item.en}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="chwNavIndicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-[#1A6B8A]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Onboarding tour — shown once after first login */}
      {user && ['patient', 'doctor', 'chw'].includes(user.role) && (
        <OnboardingTour
          userId={user.id}
          role={user.role}
          language={language}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {/* PWA install prompt — only rendered on the landing/home page */}
      {currentPage === 'landing' && (
        <PWAInstallPrompt
          language={language as 'en' | 'bn'}
          triggered={pwaPromptRequested}
          onDismiss={() => setPwaPromptRequested(false)}
        />
      )}

      {!user && currentPage === 'landing' && (
        <footer className="bg-slate-900 text-slate-400 py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-sm">© 2026 KidneyCare BD. Supporting CKD patients across Bangladesh.</p>
            <p className="text-xs mt-2 opacity-60">PWA-enabled · Bilingual · FHIR R4 Ready · Offline-capable</p>
          </div>
        </footer>
      )}
    </div>
  );
}
