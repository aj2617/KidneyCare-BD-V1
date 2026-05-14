import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellOff, X, Clock, Check } from 'lucide-react';

interface Props {
  language: 'en' | 'bn';
  token: string | null;
}

const STORAGE_KEY = 'vitals-reminder';
const PERMISSION_ASKED_KEY = 'vitals-notif-asked';

interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function getSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: false, hour: 20, minute: 0 };
}

function saveSettings(s: ReminderSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export default function VitalsReminder({ language, token }: Props) {
  const [settings, setSettings] = useState<ReminderSettings>(getSettings);
  const [showPanel, setShowPanel] = useState(false);
  const [permState, setPermState] = useState<NotificationPermission>('default');
  const [showPermPrompt, setShowPermPrompt] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const bn = language === 'bn';

  // Read current permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermState(Notification.permission);
    }
  }, []);

  // Show permission prompt once per session if not yet decided
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (sessionStorage.getItem(PERMISSION_ASKED_KEY)) return;

    const timer = setTimeout(() => {
      setShowPermPrompt(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Schedule daily check
  const scheduleCheck = useCallback(() => {
    if (!settings.enabled || permState !== 'granted') return;

    const now = new Date();
    const target = new Date();
    target.setHours(settings.hour, settings.minute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);

    const delay = target.getTime() - now.getTime();

    const tid = setTimeout(async () => {
      // Check if vitals logged today
      try {
        const res = await fetch('/api/patient/vitals?limit=1', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const loggedToday = Array.isArray(data) && data.length > 0 &&
          new Date(data[0].logged_at).toDateString() === new Date().toDateString();

        if (!loggedToday) {
          new Notification(
            bn ? 'কিডনিকেয়ার বিডি — ভাইটালস লগ করুন' : 'KidneyCare BD — Log your vitals',
            {
              body: bn
                ? 'আজকে আপনার স্বাস্থ্য তথ্য লগ করতে ভুলবেন না! আপনার স্ট্রিক বজায় রাখুন।'
                : "Don't forget to log today's vitals! Keep your streak alive.",
              icon: '/favicon.svg',
              badge: '/favicon.svg',
              tag: 'vitals-reminder',
            }
          );
        }
      } catch {
        // Silently skip if offline
      }

      scheduleCheck(); // reschedule for next day
    }, delay);

    return () => clearTimeout(tid);
  }, [settings, permState, token, bn]);

  useEffect(() => {
    const cleanup = scheduleCheck();
    return cleanup;
  }, [scheduleCheck]);

  const requestPermission = async () => {
    sessionStorage.setItem(PERMISSION_ASKED_KEY, '1');
    setShowPermPrompt(false);
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermState(result);
    if (result === 'granted') {
      const updated = { ...settings, enabled: true };
      setSettings(updated);
      saveSettings(updated);
    }
  };

  const dismissPermPrompt = () => {
    sessionStorage.setItem(PERMISSION_ASKED_KEY, '1');
    setShowPermPrompt(false);
  };

  const handleToggle = async () => {
    if (!settings.enabled && permState !== 'granted') {
      const result = await Notification.requestPermission();
      setPermState(result);
      if (result !== 'granted') return;
    }
    const updated = { ...settings, enabled: !settings.enabled };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleTimeChange = (field: 'hour' | 'minute', val: number) => {
    const updated = { ...settings, [field]: val };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleSave = () => {
    saveSettings(settings);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
    setShowPanel(false);
  };

  const notifSupported = 'Notification' in window;
  const timeStr = `${pad(settings.hour)}:${pad(settings.minute)}`;

  return (
    <>
      {/* ── One-time permission prompt ── */}
      <AnimatePresence>
        {showPermPrompt && notifSupported && (
          <motion.div
            key="perm-prompt"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="fixed bottom-20 left-4 right-4 z-[65] md:left-auto md:right-6 md:bottom-6 md:max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-4"
          >
            <button
              onClick={dismissPermPrompt}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#1A6B8A]/10 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-[#1A6B8A]" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {bn ? 'ভাইটালস রিমাইন্ডার চালু করুন' : 'Enable Vitals Reminders'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  {bn
                    ? 'প্রতিদিন একটি রিমাইন্ডার পান যাতে আপনার স্বাস্থ্য তথ্য লগ করতে না ভুলেন।'
                    : 'Get a daily reminder so you never miss logging your vitals.'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={dismissPermPrompt}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors min-h-[40px]"
              >
                {bn ? 'এখন না' : 'Not now'}
              </button>
              <button
                onClick={requestPermission}
                className="flex-[2] py-2.5 rounded-xl bg-[#1A6B8A] text-white text-xs font-bold hover:bg-[#14556e] transition-colors flex items-center justify-center gap-1.5 min-h-[40px]"
              >
                <Bell className="w-3.5 h-3.5" />
                {bn ? 'চালু করুন' : 'Enable'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bell button in header area ── */}
      <div className="relative">
        <button
          onClick={() => setShowPanel(v => !v)}
          className={`relative p-2 rounded-xl transition-colors ${
            settings.enabled && permState === 'granted'
              ? 'text-[#1A6B8A] bg-[#1A6B8A]/10'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
          title={bn ? 'ভাইটালস রিমাইন্ডার' : 'Vitals Reminder'}
        >
          {settings.enabled && permState === 'granted'
            ? <Bell className="w-5 h-5" />
            : <BellOff className="w-5 h-5" />}
          {settings.enabled && permState === 'granted' && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2ECC71] border-2 border-white" />
          )}
        </button>

        {/* ── Settings panel ── */}
        <AnimatePresence>
          {showPanel && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.92, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="absolute right-0 top-12 z-[80] w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#1A6B8A]" />
                  <p className="text-sm font-bold text-slate-900">
                    {bn ? 'ভাইটালস রিমাইন্ডার' : 'Vitals Reminder'}
                  </p>
                </div>
                <button onClick={() => setShowPanel(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Not supported */}
                {!notifSupported && (
                  <p className="text-xs text-slate-500">
                    {bn ? 'আপনার ব্রাউজার নোটিফিকেশন সমর্থন করে না।' : 'Your browser does not support notifications.'}
                  </p>
                )}

                {/* Denied */}
                {notifSupported && permState === 'denied' && (
                  <div className="p-3 bg-red-50 rounded-xl text-xs text-red-700 font-medium">
                    {bn
                      ? 'নোটিফিকেশন ব্লক করা আছে। ব্রাউজার সেটিংস থেকে অনুমতি দিন।'
                      : 'Notifications are blocked. Allow them in your browser settings.'}
                  </div>
                )}

                {notifSupported && permState !== 'denied' && (
                  <>
                    {/* Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {bn ? 'দৈনিক রিমাইন্ডার' : 'Daily reminder'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {bn ? 'ভাইটালস লগ না করলে বিজ্ঞপ্তি পান' : 'Notify if vitals not logged'}
                        </p>
                      </div>
                      <button
                        onClick={handleToggle}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          settings.enabled && permState === 'granted' ? 'bg-[#1A6B8A]' : 'bg-slate-200'
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          settings.enabled && permState === 'granted' ? 'translate-x-5' : ''
                        }`} />
                      </button>
                    </div>

                    {/* Time picker */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {bn ? 'রিমাইন্ডার সময়' : 'Reminder time'} — {timeStr}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-slate-400 block mb-1">{bn ? 'ঘণ্টা' : 'Hour'}</label>
                          <select
                            value={settings.hour}
                            onChange={e => handleTimeChange('hour', +e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{pad(i)}</option>
                            ))}
                          </select>
                        </div>
                        <span className="text-slate-400 font-bold mt-4">:</span>
                        <div className="flex-1">
                          <label className="text-xs text-slate-400 block mb-1">{bn ? 'মিনিট' : 'Min'}</label>
                          <select
                            value={settings.minute}
                            onChange={e => handleTimeChange('minute', +e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20"
                          >
                            {[0, 15, 30, 45].map(m => (
                              <option key={m} value={m}>{pad(m)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSave}
                      className="w-full py-2.5 rounded-xl bg-[#1A6B8A] text-white text-sm font-bold hover:bg-[#14556e] transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      {savedFlash ? <Check className="w-4 h-4" /> : null}
                      {savedFlash
                        ? (bn ? 'সংরক্ষিত!' : 'Saved!')
                        : (bn ? 'সেভ করুন' : 'Save')}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
