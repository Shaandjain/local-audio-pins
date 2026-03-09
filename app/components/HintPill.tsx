'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HintPillProps {
  show: boolean;
  onDismiss: () => void;
  message?: string;
}

export default function HintPill({ show, onDismiss, message }: HintPillProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute bottom-6 left-1/2 z-10"
          style={{ x: '-50%' }}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="glass-card flex items-center gap-3 px-5 py-3 rounded-full">
            <div className="relative flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#c8e636' }} />
              <div className="absolute w-2.5 h-2.5 rounded-full animate-ping opacity-75" style={{ background: '#c8e636', animationDuration: '1.5s' }} />
            </div>
            <span className="text-sm text-foreground font-medium">
              {message || "Click the map to drop a pin"}
            </span>
            <button
              onClick={onDismiss}
              className="ml-1 text-muted-light hover:text-foreground transition-colors duration-150"
              aria-label="Dismiss hint"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
