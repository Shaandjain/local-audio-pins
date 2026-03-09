'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  getSavedLocation,
  DEFAULT_POSITION,
  LOCATED_ZOOM,
  DEFAULT_ZOOM,
} from '../../utils/geolocation';

export default function NewCollectionPage() {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const saved = getSavedLocation();
    const center = saved
      ? { lng: saved.lng, lat: saved.lat }
      : { lng: DEFAULT_POSITION.lng, lat: DEFAULT_POSITION.lat };
    const zoom = saved ? LOCATED_ZOOM : DEFAULT_ZOOM;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [center.lng, center.lat],
      zoom,
    });

    mapInstance.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Collection name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    const center = mapInstance.current?.getCenter();
    const lat = center?.lat ?? DEFAULT_POSITION.lat;
    const lng = center?.lng ?? DEFAULT_POSITION.lng;

    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          center: { lat, lng },
        }),
      });

      if (res.status === 401) {
        router.push('/auth/signin');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create collection');
      }

      const collection = await res.json();
      router.push(`/c/${collection.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/collections" className="text-muted hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">New Collection</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tokyo Street Food, Paris Architecture"
              className="input"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1.5">
              Description <span className="text-muted-light font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this collection about?"
              rows={3}
              className="textarea"
            />
          </div>

          {/* Center location map */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Center location
            </label>
            <p className="text-xs text-muted-light mb-2">
              Pan the map to set the collection's center point
            </p>
            <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: 280 }}>
              <div ref={mapContainer} className="w-full h-full" />
              {/* Crosshair */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="absolute w-[1px] h-6 bg-foreground opacity-40" />
                  <div className="absolute w-6 h-[1px] bg-foreground opacity-40" />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary rounded-full flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Collection'
              )}
            </button>
            <Link href="/collections" className="btn-secondary rounded-full">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
