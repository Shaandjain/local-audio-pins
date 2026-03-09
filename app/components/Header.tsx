'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { searchLocation, NominatimResult } from '../utils/geolocation';

interface PinSearchResult {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: string;
  distance?: number | null;
}

interface HeaderProps {
  selectionMode?: boolean;
  onSelectionModeChange?: (enabled: boolean) => void;
  locationName?: string | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  onPinSelect?: (lat: number, lng: number, pinId: string) => void;
}

function categoryLabel(cat: string): string {
  return cat.charAt(0) + cat.slice(1).toLowerCase();
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function Header({ selectionMode = false, onSelectionModeChange, locationName, onLocationSelect, onPinSelect }: HeaderProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pin search state
  const [pinQuery, setPinQuery] = useState('');
  const [pinResults, setPinResults] = useState<PinSearchResult[]>([]);
  const [showPinSearch, setShowPinSearch] = useState(false);
  const [isPinSearching, setIsPinSearching] = useState(false);
  const pinSearchRef = useRef<HTMLDivElement>(null);
  const pinDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const results = await searchLocation(query);
    setSearchResults(results);
    setIsSearching(false);
  }, []);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleResultClick = (result: NominatimResult) => {
    onLocationSelect?.(parseFloat(result.lat), parseFloat(result.lon));
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  // Pin search handlers
  const handlePinSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPinResults([]);
      setIsPinSearching(false);
      return;
    }

    setIsPinSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setPinResults(data.pins);
      }
    } catch {
      // ignore
    }
    setIsPinSearching(false);
  }, []);

  const handlePinInputChange = (value: string) => {
    setPinQuery(value);
    if (pinDebounceRef.current) clearTimeout(pinDebounceRef.current);
    pinDebounceRef.current = setTimeout(() => handlePinSearch(value), 300);
  };

  const handlePinResultClick = (pin: PinSearchResult) => {
    onPinSelect?.(pin.lat, pin.lng, pin.id);
    setPinQuery('');
    setPinResults([]);
    setShowPinSearch(false);
  };

  // Close search dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setSearchResults([]);
      }
      if (pinSearchRef.current && !pinSearchRef.current.contains(e.target as Node)) {
        setShowPinSearch(false);
        setPinResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (pinDebounceRef.current) clearTimeout(pinDebounceRef.current);
    };
  }, []);

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
        {/* Logo + location */}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold text-foreground tracking-tight">
            Audio Pins
          </span>
          <AnimatePresence mode="wait">
            {locationName && (
              <motion.span
                key={locationName}
                className="text-sm text-muted-light font-normal"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                {locationName}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative" ref={searchRef}>
            {showSearch ? (
              <motion.div
                className="flex items-center gap-2"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Search a place..."
                    autoFocus
                    className="w-48 sm:w-64 px-3 py-2 rounded-full text-sm border border-border bg-surface text-foreground placeholder:text-muted-light focus:outline-none focus:border-foreground transition-all duration-200"
                    style={{ boxShadow: 'var(--shadow-glow)' }}
                  />
                  {isSearching && (
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-light" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </div>
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-hover transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Search results dropdown */}
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-border overflow-hidden z-20"
                      style={{ boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)' }}
                      initial={{ opacity: 0, scale: 0.97, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97, y: -4 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      {searchResults.map((result, i) => (
                        <motion.button
                          key={result.place_id}
                          onClick={() => handleResultClick(result)}
                          className="w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors duration-150 border-b border-border last:border-b-0"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.15 }}
                        >
                          <p className="text-sm font-medium text-foreground truncate">{result.display_name.split(',')[0]}</p>
                          <p className="text-xs text-muted-light truncate mt-0.5">{result.display_name}</p>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-hover transition-all duration-200"
                aria-label="Search location"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </button>
            )}
          </div>

          {/* Pin Search */}
          <div className="relative" ref={pinSearchRef}>
            {showPinSearch ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={pinQuery}
                    onChange={(e) => handlePinInputChange(e.target.value)}
                    placeholder="Search pins..."
                    autoFocus
                    className="w-48 sm:w-64 px-3 py-2 rounded-full text-sm border border-border bg-surface text-foreground placeholder:text-muted-light focus:outline-none focus:border-foreground transition-all duration-200"
                    style={{ boxShadow: 'var(--shadow-glow)' }}
                  />
                  {isPinSearching && (
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-light" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </div>
                <button
                  onClick={() => { setShowPinSearch(false); setPinQuery(''); setPinResults([]); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-hover transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Pin search results dropdown */}
                <AnimatePresence>
                  {pinResults.length > 0 && (
                    <motion.div
                      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-border overflow-hidden z-20"
                      style={{ boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)' }}
                      initial={{ opacity: 0, scale: 0.97, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97, y: -4 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      {pinResults.map((pin, i) => (
                        <motion.button
                          key={pin.id}
                          onClick={() => handlePinResultClick(pin)}
                          className="w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors duration-150 border-b border-border last:border-b-0"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.15 }}
                        >
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate flex-1">{pin.title}</p>
                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-surface-hover text-muted border border-border">
                              {categoryLabel(pin.category)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {pin.description && (
                              <p className="text-xs text-muted-light truncate flex-1">{pin.description}</p>
                            )}
                            {pin.distance != null && (
                              <span className="text-xs text-muted-light font-mono flex-shrink-0">{formatDistance(pin.distance)}</span>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {pinQuery.trim() && !isPinSearching && pinResults.length === 0 && (
                  <div
                    className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-border overflow-hidden z-20 animate-scale-in px-4 py-3"
                    style={{ boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)' }}
                  >
                    <p className="text-sm text-muted">No pins found</p>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowPinSearch(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-surface-hover text-foreground hover:bg-border transition-all duration-200"
                aria-label="Search pins"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <span className="hidden sm:inline">Find Pin</span>
              </button>
            )}
          </div>

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

          {/* Explore */}
          <Link
            href="/explore"
            className="group relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-surface-hover text-foreground hover:bg-border transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            <span className="hidden sm:inline">Explore</span>
          </Link>

          {/* My Collections */}
          <Link
            href="/collections"
            className="group relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-surface-hover text-foreground hover:bg-border transition-all duration-200"
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
                d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
              />
            </svg>
            <span className="hidden sm:inline">Collections</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
