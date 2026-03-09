'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface PinResult {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: string;
  thumbnailFile?: string;
  duration?: number;
  collectionId: string;
  collectionName: string;
  createdAt: string;
  distance?: number | null;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function categoryLabel(cat: string): string {
  return cat.charAt(0) + cat.slice(1).toLowerCase();
}

export default function ExplorePage() {
  const [recentPins, setRecentPins] = useState<PinResult[]>([]);
  const [nearbyPins, setNearbyPins] = useState<PinResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetch('/api/search?sort=newest&limit=12');
      if (res.ok) {
        const data = await res.json();
        setRecentPins(data.pins);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchNearby = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/pins/nearby?lat=${lat}&lng=${lng}&radius=50000&limit=12`);
      if (res.ok) {
        const data = await res.json();
        setNearbyPins(data.pins);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setLoading(true);

    fetchRecent().finally(() => setLoading(false));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          fetchNearby(loc.lat, loc.lng);
        },
        () => {
          // Geolocation denied
        },
        { enableHighAccuracy: false, timeout: 8000 }
      );
    }
  }, [fetchRecent, fetchNearby]);

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-5 h-16 flex items-center justify-between border-b border-border"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Explore</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-muted">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Loading pins...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Nearby Section */}
            {nearbyPins.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-foreground tracking-tight mb-4">Nearby</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nearbyPins.map((pin) => (
                    <PinCard key={pin.id} pin={pin} showDistance={true} />
                  ))}
                </div>
              </section>
            )}

            {/* Recent Pins */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold text-foreground tracking-tight mb-4">Recent Pins</h2>
              {recentPins.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted">No pins yet. Drop your first pin on the map!</p>
                  <Link href="/" className="inline-block mt-4 btn-primary rounded-full px-5 py-2.5 text-sm font-medium">
                    Go to map
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentPins.map((pin) => (
                    <PinCard key={pin.id} pin={pin} showDistance={!!userLocation} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function PinCard({ pin, showDistance }: { pin: PinResult; showDistance: boolean }) {
  return (
    <Link
      href={`/c/${pin.collectionId}?pin=${pin.id}`}
      className="card p-4 hover:border-border-strong transition-all duration-200 block"
    >
      {pin.thumbnailFile && (
        <div className="relative w-full h-32 mb-3 rounded-lg overflow-hidden bg-surface-hover">
          <img
            src={`/api/photos/${pin.thumbnailFile}`}
            alt={pin.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-foreground text-sm truncate flex-1">{pin.title}</h3>
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-hover text-muted border border-border">
          {categoryLabel(pin.category)}
        </span>
      </div>
      {pin.description && (
        <p className="text-xs text-muted mt-1 line-clamp-2">{pin.description}</p>
      )}
      <div className="flex items-center justify-between mt-2 text-[11px] text-muted-light">
        <span>{formatRelativeTime(pin.createdAt)}</span>
        <div className="flex items-center gap-2">
          {showDistance && pin.distance != null && (
            <span className="font-mono">{formatDistance(pin.distance)}</span>
          )}
          <span className="truncate max-w-[100px]">{pin.collectionName}</span>
        </div>
      </div>
    </Link>
  );
}
