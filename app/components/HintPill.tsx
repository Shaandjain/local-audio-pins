'use client';

import { useState, useEffect } from 'react';

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

  if (!visible) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 animate-slide-up">
      <div className="flex items-center gap-3 px-5 py-3 bg-foreground rounded-full"
           style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)' }}>
        <div className="relative flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-white rounded-full" />
          <div className="absolute w-2.5 h-2.5 bg-white rounded-full animate-ping opacity-75" style={{ animationDuration: '1.5s' }} />
        </div>
        <span className="text-sm text-surface font-medium">
          {message || "Click the map to drop a pin"}
        </span>
        <button
          onClick={onDismiss}
          className="ml-1 text-surface/50 hover:text-surface transition-colors duration-150"
          aria-label="Dismiss hint"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
