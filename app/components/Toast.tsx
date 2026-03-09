'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  show: boolean;
  message?: string;
  onDismiss?: () => void;
}

export default function Toast({ show, message = 'Pin saved!', onDismiss }: ToastProps) {
  useEffect(() => {
    if (!show) return;
    const timer = window.setTimeout(() => {
      onDismiss?.();
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-6 left-1/2 z-50"
          style={{ x: '-50%' }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          aria-live="polite"
        >
          <div
            className="glass-card rounded-full px-4 py-2.5 flex items-center gap-2"
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: '#c8e636' }}
              aria-hidden="true"
            >
              <svg className="w-3.5 h-3.5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span className="text-sm font-medium text-foreground">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
