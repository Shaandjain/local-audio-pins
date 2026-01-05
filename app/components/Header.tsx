'use client';

import { useState } from 'react';
import Link from 'next/link';

interface HeaderProps {
  selectionMode?: boolean;
  onSelectionModeChange?: (enabled: boolean) => void;
}

export default function Header({ selectionMode = false, onSelectionModeChange }: HeaderProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
      <div
        className="flex items-center justify-between px-5 h-16 pointer-events-auto"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
        }}
      >
        {/* Logo - clean wordmark */}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold text-foreground tracking-tight">
            Audio Pins
          </span>
          <span className="text-sm text-muted-light font-normal">Toronto</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Select Area Toggle */}
          {onSelectionModeChange && (
            <button
              onClick={() => onSelectionModeChange(!selectionMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectionMode
                  ? 'bg-foreground text-white shadow-md'
                  : 'bg-surface-hover text-foreground hover:bg-border'
              }`}
              aria-label={selectionMode ? 'Exit selection mode' : 'Enter selection mode'}
              aria-pressed={selectionMode}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                />
              </svg>
              <span className="hidden sm:inline">
                {selectionMode ? 'Selecting' : 'Select Area'}
              </span>
            </button>
          )}

          {/* How it works */}
          <div className="relative">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-hover transition-all duration-200"
              aria-label="How it works"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                />
              </svg>
            </button>

            {showHelp && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowHelp(false)}
                />
                <div className="absolute right-0 top-full mt-3 w-80 p-5 bg-white rounded-2xl border border-border z-20 animate-scale-in"
                     style={{ boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)' }}>
                  <h3 className="font-semibold text-foreground mb-2 text-base">
                    How it works
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    Click anywhere on the map to drop a pin and record a voice note.
                    Use <span className="font-medium text-foreground">Select Area</span> to
                    draw a region and generate a walking tour from your pins.
                  </p>
                  <button
                    onClick={() => setShowHelp(false)}
                    className="mt-4 text-sm bg-foreground text-white px-4 py-2 rounded-full font-medium hover:bg-accent-hover transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Browse all */}
          <Link
            href="/c/default"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-surface-hover text-foreground hover:bg-border transition-all duration-200"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
            <span className="hidden sm:inline">All Pins</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
