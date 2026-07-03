import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share, Plus, Smartphone } from 'lucide-react';

interface Props {
  language: 'en' | 'bn';
  /** When true, show the prompt immediately (used after first vitals save) */
  triggered?: boolean;
  /** Called when the sheet is dismissed so parent can reset state */
  onDismiss?: () => void;
}

const DISMISSED_KEY = 'pwa-install-dismissed';
const VITALS_KEY   = 'pwa-prompted-after-vitals';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export default function PWAInstallPrompt({ language, triggered = false, onDismiss }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [installing, setInstalling] = useState(false);

  const bn = language === 'bn';

  // Always capture the beforeinstallprompt event so we have it ready
  useEffect(() => {
    setIsIOSDevice(isIOS());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isInStandaloneMode() && !localStorage.getItem(DISMISSED_KEY)) {
        setShow(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (!isIOSDevice) return;
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, [isIOSDevice]);

  // Show when triggered by parent (after first vitals save)
  useEffect(() => {
    if (!triggered) return;
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (localStorage.getItem(VITALS_KEY)) return;

    // Mark so we only trigger once across sessions
    localStorage.setItem(VITALS_KEY, '1');
    // Small delay so the success animation plays first
    const t = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(t);
  }, [triggered]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      dismiss();
    } else {
      setInstalling(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, '1');
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[60] md:hidden"
            onClick={dismiss}
          />

          {/* ── Mobile bottom sheet ── */}
          <motion.div
            key="sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-10 md:hidden"
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-5" />

            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Celebration header */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1A6B8A] to-[#0f4a63] text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-[#1A6B8A]/30 shrink-0">
                K
              </div>
              <div>
                <p className="text-base font-black text-slate-900">
                  {bn ? '✓ ভাইটালস সেভ হয়েছে!' : '✓ Vitals saved!'}
                </p>
                <p className="text-sm text-slate-500">
                  {bn ? 'কিডনিকেয়ার বিডি হোম স্ক্রিনে যোগ করুন' : 'Add KidneyCare BD to your home screen'}
                </p>
              </div>
            </div>

            {/* Benefit chips */}
            <div className="flex flex-wrap gap-2 mb-5">
              {(bn
                ? ['⚡ দ্রুত অ্যাক্সেস', '📴 অফলাইন সাপোর্ট', '🔔 রিমাইন্ডার']
                : ['⚡ Faster access', '📴 Works offline', '🔔 Reminders']
              ).map(chip => (
                <span key={chip} className="text-xs font-semibold px-3 py-1 bg-[#1A6B8A]/10 text-[#1A6B8A] rounded-full">
                  {chip}
                </span>
              ))}
            </div>

            {/* iOS step-by-step */}
            {isIOSDevice ? (
              <div className="bg-slate-50 rounded-2xl p-4 mb-5 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {bn ? 'কিভাবে ইনস্টল করবেন' : 'How to install on iPhone'}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1A6B8A]/10 flex items-center justify-center shrink-0">
                    <Share className="w-4 h-4 text-[#1A6B8A]" />
                  </div>
                  <p className="text-sm text-slate-700">
                    {bn ? 'Safari-এ নিচের Share বাটনে ট্যাপ করুন' : 'Tap the Share button in Safari'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1A6B8A]/10 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4 text-[#1A6B8A]" />
                  </div>
                  <p className="text-sm text-slate-700">
                    {bn ? '"হোম স্ক্রিনে যোগ করুন" বেছে নিন' : 'Select "Add to Home Screen"'}
                  </p>
                </div>
                <button
                  onClick={dismiss}
                  className="w-full py-3 rounded-2xl bg-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-300 transition-colors min-h-[48px]"
                >
                  {bn ? 'বুঝেছি' : 'Got it'}
                </button>
              </div>
            ) : (
              /* Android / Chrome */
              <div className="flex gap-3">
                <button
                  onClick={dismiss}
                  className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors min-h-[48px]"
                >
                  {bn ? 'পরে করব' : 'Maybe Later'}
                </button>
                <button
                  onClick={deferredPrompt ? handleInstall : dismiss}
                  disabled={installing}
                  className="flex-[2] py-3.5 rounded-2xl bg-[#1A6B8A] text-white text-sm font-bold hover:bg-[#14556e] transition-colors flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-60"
                >
                  {installing ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {bn ? 'ইনস্টল করুন' : 'Install App'}
                </button>
              </div>
            )}
          </motion.div>

          {/* ── Desktop toast banner ── */}
          <motion.div
            key="desktop-banner"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="hidden md:flex fixed bottom-6 right-6 z-[70] items-center gap-4 bg-white border border-slate-200 rounded-2xl shadow-2xl px-5 py-4 max-w-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1A6B8A] text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">
                {bn ? 'অ্যাপ ইনস্টল করুন' : 'Install KidneyCare BD'}
              </p>
              <p className="text-xs text-slate-500">
                {bn ? 'অফলাইনেও কাজ করে' : 'Works offline too'}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {!isIOSDevice && deferredPrompt && (
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="px-3 py-2 bg-[#1A6B8A] text-white text-xs font-bold rounded-xl hover:bg-[#14556e] transition-colors flex items-center gap-1.5 min-h-[36px] disabled:opacity-60"
                >
                  {installing
                    ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Download className="w-3.5 h-3.5" />}
                  {bn ? 'ইনস্টল' : 'Install'}
                </button>
              )}
              <button onClick={dismiss} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
