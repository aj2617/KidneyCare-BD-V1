import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import {
  Activity, Calculator, BookOpen, DollarSign, LayoutDashboard,
  Users, Map as MapIcon, Bell, LogOut, Menu, X, Globe, User,
  Utensils, Heart, Video, FileText, BarChart2, Wifi, WifiOff, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import PWAInstallPrompt from './components/PWAInstallPrompt';
import VitalsReminder from './components/VitalsReminder';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
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

export default function App() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [currentPage, setCurrentPage] = useState('landing');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [teleconsultPatient, setTeleconsultPatient] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    const handleNavigate = (e: any) => {
      if (e.detail?.page) {
        setCurrentPage(e.detail.page);
        if (e.detail.teleconsultPatient) setTeleconsultPatient(e.detail.teleconsultPatient);
      } else {
        setCurrentPage(e.detail);
      }
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role === 'patient') setCurrentPage('dashboard');
      else if (user.role === 'doctor') setCurrentPage('doctor-dashboard');
      else if (user.role === 'admin') setCurrentPage('admin-dashboard');
      else if (user.role === 'chw') setCurrentPage('chw-dashboard');
    } else {
      setCurrentPage('landing');
    }
  }, [user]);

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

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  const navItems: Record<string, Array<{ id: string; label: string; icon: any }>> = {
    patient: [
      { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
      { id: 'gfr', label: t('nav.gfr'), icon: Calculator },
      { id: 'vitals', label: t('nav.vitals'), icon: Activity },
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
      { id: 'admin-dashboard', label: t('admin.heatmap'), icon: MapIcon },
      { id: 'admin-reports', label: t('admin.reports'), icon: Activity },
      { id: 'admin-simulator', label: t('admin.simulator'), icon: BarChart2 },
      { id: 'admin-cohorts', label: t('admin.cohorts'), icon: Users },
      { id: 'fhir', label: t('nav.fhir'), icon: Cpu },
    ],
    chw: [
      { id: 'chw-dashboard', label: t('chw.dashboard'), icon: Users },
    ],
  };

  const renderPage = () => {
    if (currentPage === 'landing') return <Landing onStart={() => setCurrentPage('register')} onLogin={() => setCurrentPage('login')} />;
    if (currentPage === 'login') return <Login onRegister={() => setCurrentPage('register')} />;
    if (currentPage === 'register') return <Register onLogin={() => setCurrentPage('login')} />;

    if (user?.role === 'patient') {
      switch (currentPage) {
        case 'dashboard': return <PatientDashboard />;
        case 'gfr': return <GfrCalculator />;
        case 'vitals': return <VitalsLog />;
        case 'diet': return <DietAssistant />;
        case 'education': return <Education />;
        case 'cost': return <CostPlanner />;
        case 'caregiver': return <CaregiverView />;
        case 'profile': return <Profile />;
      }
    }

    if (user?.role === 'doctor') {
      if (currentPage === 'doctor-dashboard') return <DoctorDashboard onSelectPatient={(id) => setCurrentPage(`patient-${id}`)} />;
      if (currentPage === 'doctor-alerts') return <DoctorAlerts />;
      if (currentPage === 'prescriptions') return <Prescriptions />;
      if (currentPage === 'teleconsult') return <Teleconsult patientId={teleconsultPatient?.id} patientName={teleconsultPatient?.name} onEnd={() => setCurrentPage('doctor-dashboard')} />;
      if (currentPage.startsWith('patient-')) return <PatientDetail id={currentPage.split('-')[1]} onBack={() => setCurrentPage('doctor-dashboard')} />;
    }

    if (user?.role === 'admin') {
      if (currentPage === 'admin-dashboard' || currentPage === 'admin-reports') {
        return <AdminDashboard initialTab={currentPage === 'admin-reports' ? 'reports' : 'heatmap'} />;
      }
      if (currentPage === 'admin-simulator') return <BudgetSimulator />;
      if (currentPage === 'admin-cohorts') return <OutcomeCohorts />;
      if (currentPage === 'fhir') return <FHIRViewer />;
    }

    if (user?.role === 'chw') {
      return <CHWDashboard />;
    }

    return <div className="p-8 text-slate-500">Page under construction: {currentPage}</div>;
  };

  const role = user?.role as string;
  const currentNavItems = navItems[role] || [];

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#1E293B] font-sans">
      {/* Offline Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-500 text-white text-sm font-semibold text-center py-2 flex items-center justify-center gap-2 z-[100]"
          >
            <WifiOff className="w-4 h-4" />
            {t('offline.banner')}
          </motion.div>
        )}
        {isOnline && typeof window !== 'undefined' && (
          <></>
        )}
      </AnimatePresence>

      {user ? (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center gap-2 text-[#1A6B8A] font-bold text-xl">
                  <Activity className="w-8 h-8" />
                  <span className="hidden sm:block">{t('app.name')}</span>
                </div>
                <div className="hidden lg:ml-6 lg:flex lg:space-x-1">
                  {currentNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                        currentPage === item.id || currentPage.startsWith(item.id + '-')
                          ? 'bg-[#1A6B8A]/10 text-[#1A6B8A]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="hidden xl:inline">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Online/Offline indicator */}
                <div className={`hidden sm:flex items-center gap-1 text-xs font-medium ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                  <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline'}</span>
                </div>
                {/* Vitals reminder bell — patients only */}
                {user?.role === 'patient' && (
                  <VitalsReminder language={language as 'en' | 'bn'} token={token} />
                )}
                <button
                  onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                  className="p-2 text-slate-500 hover:text-[#1A6B8A] transition-colors flex items-center gap-1 text-sm font-medium"
                >
                  <Globe className="w-4 h-4" />
                  {language === 'en' ? 'বাংলা' : 'English'}
                </button>
                <div className="hidden md:flex items-center gap-3 pl-3 border-l border-slate-200">
                  <span className="text-sm font-medium text-slate-700">{user.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase font-bold">{user.role}</span>
                  <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Logout">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
                <div className="lg:hidden flex items-center">
                  <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-500">
                    {isMobileMenuOpen ? <X /> : <Menu />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden bg-white border-t border-slate-100"
              >
                <div className="px-2 pt-2 pb-3 space-y-1">
                  {currentNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setCurrentPage(item.id); setIsMobileMenuOpen(false); }}
                      className={`flex items-center gap-3 w-full text-left px-3 py-3 rounded-md text-base font-medium ${
                        currentPage === item.id ? 'bg-[#1A6B8A]/10 text-[#1A6B8A]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  ))}
                  <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      ) : (
        <nav className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="min-h-[72px] flex items-center justify-between gap-4">
              <button onClick={() => setCurrentPage('landing')} className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#1A6B8A] text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-[#1A6B8A]/20">K</div>
                <span className="text-[18px] md:text-[20px] font-black text-[#1A6B8A]">{t('app.name')}</span>
              </button>
              <div className="hidden md:flex items-center gap-4">
                <div className="h-7 w-px bg-slate-200" />
                <button onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                  className="px-3 py-2 text-slate-600 hover:text-[#1A6B8A] transition-colors flex items-center gap-2 text-sm font-medium">
                  <Globe className="w-4 h-4" />
                  {language === 'en' ? 'বাংলা' : 'English'}
                </button>
                <button onClick={() => setCurrentPage('login')} className="px-4 py-2 text-[#1A6B8A] font-bold hover:text-[#14556e] transition-colors">Login</button>
                <button onClick={() => setCurrentPage('register')} className="px-5 py-2.5 rounded-2xl bg-[#1A6B8A] text-white font-bold shadow-lg shadow-[#1A6B8A]/20 hover:bg-[#14556e] transition-all">Register</button>
              </div>
              <div className="md:hidden flex items-center gap-2">
                <button onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')} className="p-2 text-slate-500 hover:text-[#1A6B8A]"><Globe className="w-5 h-5" /></button>
                <button onClick={() => setCurrentPage('login')} className="px-3 py-2 text-sm font-bold text-[#1A6B8A]">Login</button>
                <button onClick={() => setCurrentPage('register')} className="px-4 py-2 rounded-xl bg-[#1A6B8A] text-white text-sm font-bold">Register</button>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${user?.role === 'patient' ? 'pb-24 md:pb-8' : ''}`}>
        <motion.div key={currentPage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
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

      {/* PWA install prompt — patients only */}
      {user?.role === 'patient' && <PWAInstallPrompt language={language as 'en' | 'bn'} />}

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
