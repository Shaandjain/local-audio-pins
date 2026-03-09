'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SelectionPanelProps {
  pinCount: number;
  onGenerateTour: () => void;
  onClear: () => void;
  onExit: () => void;
  isGenerating?: boolean;
}

function useCountUp(target: number, duration: number = 400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

export default function SelectionPanel({
  pinCount,
  onGenerateTour,
  onClear,
  onExit,
  isGenerating = false,
}: SelectionPanelProps) {
  const animatedCount = useCountUp(pinCount);
  const hasPin = pinCount > 0;

  return (
    <motion.div
      className="absolute bottom-20 left-1/2 z-30"
      style={{ x: '-50%' }}
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="glass-card px-5 py-3.5">
        <div className="flex items-center gap-4">
          {/* Pin Count */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
                 style={{ background: '#c8e636' }}>
              <span className="text-xs font-bold text-foreground">{animatedCount}</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {pinCount === 1 ? 'pin' : 'pins'} selected
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-border" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <motion.button
              onClick={onGenerateTour}
              disabled={pinCount === 0 || isGenerating}
              className={`text-sm px-4 py-2 rounded-full font-semibold transition-all duration-200 ${
                pinCount === 0 || isGenerating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{
                background: '#c8e636',
                color: '#1a1a1a',
                boxShadow: hasPin && !isGenerating ? '0 2px 8px rgba(200,230,54,0.3)' : 'none',
              }}
              animate={hasPin && !isGenerating ? { scale: [1, 1.02, 1] } : undefined}
              transition={hasPin && !isGenerating ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : undefined}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Generate Tour'
              )}
            </motion.button>

            <button
              onClick={onClear}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-white/60 transition-all duration-200"
              aria-label="Redraw selection"
              title="Redraw"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>

            <button
              onClick={onExit}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-white/60 transition-all duration-200"
              aria-label="Exit selection mode"
              title="Exit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
