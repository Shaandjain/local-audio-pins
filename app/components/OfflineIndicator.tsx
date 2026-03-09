'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPendingCount, syncPendingPins } from '../utils/offlineQueue';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const spring = { type: 'spring' as const, stiffness: 350, damping: 25 };

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB may not be available
    }
  }, []);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    refreshPendingCount();

    const handleOffline = () => setIsOffline(true);
    const handleOnline = async () => {
      setIsOffline(false);
      const count = await getPendingCount();
      if (count > 0) {
        setSyncing(true);
        try {
          await syncPendingPins();
        } finally {
          setSyncing(false);
          refreshPendingCount();
        }
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    const interval = setInterval(refreshPendingCount, 5000);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [refreshPendingCount]);

  const visible = isOffline || pendingCount > 0 || syncing;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -40 }}
          transition={spring}
        >
          <div
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-full text-sm"
            style={{ boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)' }}
          >
            {isOffline ? (
              <>
                <div className="w-2 h-2 rounded-full bg-muted-light" />
                <span className="font-medium text-foreground">
                  You&apos;re offline
                </span>
                {pendingCount > 0 && (
                  <span className="text-muted">
                    &middot; {pendingCount} pin{pendingCount !== 1 ? 's' : ''} pending
                  </span>
                )}
              </>
            ) : syncing ? (
              <>
                <svg className="w-4 h-4 animate-spin text-foreground" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="font-medium text-foreground">Syncing pins...</span>
              </>
            ) : pendingCount > 0 ? (
              <>
                <div className="w-2 h-2 rounded-full bg-foreground" />
                <span className="font-medium text-foreground">
                  {pendingCount} pin{pendingCount !== 1 ? 's' : ''} waiting to sync
                </span>
              </>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
