'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import { Download, Share2, Plus, X, Smartphone } from 'lucide-react';

const STORAGE_DISMISSED = 'alcoin_pwa_dismissed';
const STORAGE_INSTALLED = 'alcoin_pwa_installed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(ua as any).includes('CriOS');
}

type Platform = 'android' | 'ios' | 'desktop';

function detectPlatform(): Platform {
  if (isIOS()) return 'ios';
  const ua = navigator.userAgent;
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export default function PwaInstallPrompt() {
  const view = useAppStore((s) => s.view);
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>('desktop');
  const deferredPromptRef = useRef<any>(null);

  // Register service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {/* silent */});
    }
  }, []);

  // Check if already installed or dismissed
  const shouldShow = useCallback((): boolean => {
    if (isStandalone()) {
      localStorage.setItem(STORAGE_INSTALLED, '1');
      return false;
    }
    if (localStorage.getItem(STORAGE_INSTALLED)) return false;
    if (localStorage.getItem(STORAGE_DISMISSED)) return false;
    return true;
  }, []);

  // Capture the browser install prompt (Android/Chrome)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Detect when app is installed
    window.addEventListener('appinstalled', () => {
      localStorage.setItem(STORAGE_INSTALLED, '1');
      setShow(false);
      deferredPromptRef.current = null;
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // Show popup after user reaches dashboard (with small delay)
  useEffect(() => {
    if (view !== 'dashboard' && view !== 'admin-dashboard') return;

    const timer = setTimeout(() => {
      if (shouldShow()) {
        setPlatform(detectPlatform());
        // On desktop Chrome, also check if install prompt is available
        setShow(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [view, shouldShow]);

  const handleInstall = async () => {
    // Android/Chrome: use native prompt
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem(STORAGE_INSTALLED, '1');
      }
      deferredPromptRef.current = null;
      setShow(false);
      return;
    }
    // Fallback: no native prompt available (desktop without Chrome, etc.)
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_DISMISSED, '1');
    setShow(false);
  };

  const handleGotIt = () => {
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleDismiss}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-md glass-strong rounded-t-3xl sm:rounded-2xl p-6 border border-[#d4af37]/20 shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Icon + Title */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center shrink-0">
                <Download className="w-7 h-7 text-black" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Install ALCOIN</h2>
                <p className="text-sm text-muted-foreground">
                  Faster access, right from your home screen.
                </p>
              </div>
            </div>

            {/* Platform-specific instructions */}
            {platform === 'ios' ? (
              /* iPhone / Safari instructions */
              <div className="bg-white/[0.03] rounded-xl p-4 mb-5 space-y-3 border border-white/5">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#d4af37]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#d4af37]">1</span>
                  </div>
                  <p className="text-sm">Tap <Share2 className="w-4 h-4 inline mx-1 text-[#d4af37]" /> <strong>Share</strong> in Safari</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#d4af37]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#d4af37]">2</span>
                  </div>
                  <p className="text-sm">Select <strong>&quot;Add to Home Screen&quot;</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#d4af37]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#d4af37]">3</span>
                  </div>
                  <p className="text-sm">Tap <strong>&quot;Add&quot;</strong></p>
                </div>
              </div>
            ) : (
              /* Android / Desktop */
              <div className="bg-white/[0.03] rounded-xl p-4 mb-5 flex items-center gap-3 border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {platform === 'android'
                    ? 'Tap the button below to install ALCOIN on your device.'
                    : 'Install ALCOIN as a desktop app for quick access.'}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              {platform === 'ios' ? (
                <>
                  <button
                    onClick={handleGotIt}
                    className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    Got it
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    Maybe Later
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleInstall}
                    className="flex-1 h-11 rounded-xl gradient-gold text-black text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Install ALCOIN
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    Maybe Later
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
