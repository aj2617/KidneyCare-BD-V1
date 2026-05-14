import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share, Plus } from 'lucide-react';

interface Props {
  language: 'en' | 'bn';
}

const STORAGE_KEY = 'pwa-install-dismissed';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export default function PWAInstallPrompt({ language }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [installing, setInstalling] = useState(false);

  const bn = language === 'bn';

  useEffect(() => {
    // Don't show if already installed or dismissed before
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const ios = isIOS();
    setIsIOSDevice(ios);

    if (ios) {
      // iOS: show manual instructions prompt after a short delay
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome: listen for the browser's native prompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Wait a moment after login before showing
      setTimeout(() => setShow(true), 2500);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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
    localStorage.setItem(STORAGE_KEY, '1');
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop — subtle, not blocking */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-[60] md:hidden"
            onClick={dismiss}
          />

          {/* Bottom sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 md:hidden"
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-5" />

            {/* Dismiss button */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>

            {/* App icon */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-[#1A6B8A] text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-[#1A6B8A]/25 shrink-0">
                K
              </div>
              <div>
                <p className="text-base font-black text-slate-900">
                  {bn ? 'কিডনিকেয়ার বিডি' : 'KidneyCare BD'}
                </p>
                <p className="text-sm text-slate-500">
                  {bn ? 'হোম স্ক্রিনে যোগ করুন' : 'Add to Home Screen'}
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-600 leading-relaxed mb-5">
              {bn
                ? 'অ্যাপটি ইনস্টল করুন এবং ইন্টারনেট ছাড়াও আপনার কিডনি স্বাস্থ্য পর্যবেক্ষণ করুন। দ্রুত অ্যাক্সেস, অফলাইন সাপোর্ট।'
                : 'Install the app for quick access and offline support — even without internet, track your kidney health from your home screen.'}
            </p>

            {/* iOS manual instructions */}
            {isIOSDevice ? (
              <div className="bg-slate-50 rounded-2xl p-4 mb-5 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {bn ? 'কিভাবে যোগ করবেন' : 'How to install'}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#1A6B8A]/10 flex items-center justify-center shrink-0">
                    <Share className="w-4 h-4 text-[#1A6B8A]" />
                  </div>
                  <p className="text-sm text-slate-700">
                    {bn
                      ? 'Safari-এ নিচের Share বাটনে ট্যাপ করুন'
                      : 'Tap the Share button at the bottom of Safari'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#1A6B8A]/10 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4 text-[#1A6B8A]" />
                  </div>
                  <p className="text-sm text-slate-700">
                    {bn
                      ? '"হোম স্ক্রিনে যোগ করুন" বেছে নিন'
                      : 'Select "Add to Home Screen"'}
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
              /* Android / Chrome install button */
              <div className="flex gap-3">
                <button
                  onClick={dismiss}
                  className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors min-h-[48px]"
                >
                  {bn ? 'পরে করব' : 'Maybe Later'}
                </button>
                <button
                  onClick={handleInstall}
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

          {/* ── Desktop banner (optional, tasteful) ── */}
          <motion.div
            key="desktop-banner"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="hidden md:flex fixed top-20 right-6 z-[70] items-center gap-4 bg-white border border-slate-200 rounded-2xl shadow-xl px-5 py-4 max-w-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1A6B8A] text-white flex items-center justify-center text-lg font-black shrink-0">
              K
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">
                {bn ? 'অ্যাপ ইনস্টল করুন' : 'Install KidneyCare BD'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {bn ? 'অফলাইনেও ব্যবহার করুন' : 'Works offline too'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isIOSDevice && (
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="px-3 py-2 bg-[#1A6B8A] text-white text-xs font-bold rounded-xl hover:bg-[#14556e] transition-colors flex items-center gap-1.5 min-h-[36px]"
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
