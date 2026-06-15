import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellOff, X, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  language: 'en' | 'bn';
}

const DISMISSED_KEY = 'notif-optin-dismissed';

function supported() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export default function NotificationOptIn({ language }: Props) {
  const { token } = useAuth();
  const [show, setShow]         = useState(false);
  const [status, setStatus]     = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const bn = language === 'bn';

  useEffect(() => {
    if (!supported()) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    // Small delay so the page settles
    const t = setTimeout(() => setShow(true), 600);
    return () => clearTimeout(t);
  }, []);

  // If permission changed externally (already granted/denied), hide
  useEffect(() => {
    if (Notification.permission !== 'default') setShow(false);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  const subscribe = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('error');
        setErrorMsg(bn ? 'অনুমতি প্রত্যাখ্যান করা হয়েছে।' : 'Permission denied — enable notifications in browser settings.');
        return;
      }

      // Fetch VAPID public key from server
      const keyRes = await fetch('/api/push/public-key');
      const { publicKey } = await keyRes.json();

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Save subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscription, language }),
      });

      setStatus('success');
      // Auto-dismiss after showing success
      setTimeout(() => { setShow(false); }, 2800);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message || (bn ? 'সাবস্ক্রিপশন ব্যর্থ হয়েছে।' : 'Subscription failed.'));
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative bg-gradient-to-r from-[#1A6B8A]/8 to-[#1A6B8A]/4 border border-[#1A6B8A]/20 rounded-2xl p-4"
        >
          {/* Dismiss button */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          {status === 'success' ? (
            <div className="flex items-center gap-3 pr-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#EAFAF1' }}>
                <CheckCircle2 className="w-5 h-5" style={{ color: '#2ECC71' }} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {bn ? 'নোটিফিকেশন চালু হয়েছে!' : 'Reminders enabled!'}
                </p>
                <p className="text-xs text-slate-500">
                  {bn ? 'প্রতিদিন সকাল ৮টায় রিমাইন্ডার পাবেন।' : "You'll get a reminder at 8 AM if you haven't logged yet."}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 pr-6">
              <div className="w-10 h-10 rounded-full bg-[#1A6B8A]/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-5 h-5 text-[#1A6B8A]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {bn ? 'দৈনিক ভাইটালস রিমাইন্ডার' : 'Daily vitals reminder'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 mb-3">
                  {bn
                    ? 'প্রতিদিন সকাল ৮টায় নোটিফিকেশন পান — যদি সেদিন ভাইটালস লগ না করা হয়।'
                    : "Get a push notification at 8 AM on any day you haven't logged vitals yet."}
                </p>

                {status === 'error' && (
                  <p className="text-xs text-red-600 font-medium mb-2 flex items-center gap-1">
                    <BellOff className="w-3.5 h-3.5 shrink-0" /> {errorMsg}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={subscribe}
                    disabled={status === 'loading'}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1A6B8A] text-white text-xs font-bold rounded-xl hover:bg-[#14556e] transition-colors min-h-[36px] disabled:opacity-60"
                  >
                    {status === 'loading'
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Bell className="w-3.5 h-3.5" />}
                    {bn ? 'রিমাইন্ডার চালু করুন' : 'Enable Reminders'}
                  </button>
                  <button
                    onClick={dismiss}
                    className="px-4 py-2 text-slate-500 text-xs font-semibold hover:text-slate-700 transition-colors min-h-[36px]"
                  >
                    {bn ? 'পরে' : 'Not now'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
