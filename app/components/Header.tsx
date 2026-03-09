'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { searchLocation, NominatimResult } from '../utils/geolocation';

interface HeaderProps {
  selectionMode?: boolean;
  onSelectionModeChange?: (enabled: boolean) => void;
  locationName?: string | null;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export default function Header({ selectionMode = false, onSelectionModeChange, locationName, onLocationSelect }: HeaderProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setSearchResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
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
          {locationName && (
            <span className="text-sm text-muted-light font-normal">{locationName}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative" ref={searchRef}>
            {showSearch ? (
              <div className="flex items-center gap-2">
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
                {searchResults.length > 0 && (
                  <div
                    className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-border overflow-hidden z-20 animate-scale-in"
                    style={{ boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)' }}
                  >
                    {searchResults.map((result) => (
                      <button
                        key={result.place_id}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors duration-150 border-b border-border last:border-b-0"
                      >
                        <p className="text-sm font-medium text-foreground truncate">{result.display_name.split(',')[0]}</p>
                        <p className="text-xs text-muted-light truncate mt-0.5">{result.display_name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
