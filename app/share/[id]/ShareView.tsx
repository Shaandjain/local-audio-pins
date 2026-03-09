'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'framer-motion';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const spring = { type: 'spring' as const, stiffness: 350, damping: 25 };

const listContainer = {
  hidden: { opacity: prefersReducedMotion ? 1 : 0 },
  show: {
    opacity: 1,
    transition: prefersReducedMotion ? {} : { staggerChildren: 0.06 },
  },
};

const listItem = {
  hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 16 },
  show: { opacity: 1, y: 0, transition: spring },
};

interface Pin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  audioFile: string;
  photoFile?: string;
  thumbnailFile?: string;
  category?: string;
  createdAt: string;
}

interface ShareCollection {
  id: string;
  name: string;
  description: string | null;
  center: { lat: number; lng: number };
  pinCount: number;
  creator: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  pins: Pin[];
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

export default function ShareView({ collection }: { collection: ShareCollection }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<globalThis.Map<string, maplibregl.Marker>>(new globalThis.Map());
  const popupsRef = useRef<globalThis.Map<string, maplibregl.Popup>>(new globalThis.Map());
  const [showPinsList, setShowPinsList] = useState(true);
  const [playingPinId, setPlayingPinId] = useState<string | null>(null);

  const closeAllPopups = useCallback(() => {
    popupsRef.current.forEach((popup) => {
      if (popup.isOpen()) popup.remove();
    });
  }, []);

  const createMarkerElement = useCallback(() => {
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.innerHTML = `
      <div style="
        width: 36px;
        height: 36px;
        background: #171717;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
      </div>
    `;
    return el;
  }, []);

  const addMarkerForPin = useCallback((pin: Pin, map: maplibregl.Map) => {
    const popupContent = `
      <div style="padding: 20px; min-width: 260px; max-width: 300px;">
        ${pin.photoFile ? `
          <a href="/api/photos/${pin.photoFile}" target="_blank" rel="noopener noreferrer">
            <img
              src="/api/photos/${pin.thumbnailFile || pin.photoFile}"
              alt="${pin.title || 'Pin photo'}"
              style="width: 100%; height: 180px; object-fit: cover; border-radius: 12px; margin-bottom: 12px; cursor: pointer;"
            />
          </a>
        ` : ''}
        <h3 style="font-weight: 600; color: #0A0A0A; font-size: 17px; margin-bottom: 6px; letter-spacing: -0.02em;">
          ${pin.title || 'Untitled Pin'}
        </h3>
        ${pin.description ? `<p style="font-size: 14px; color: #525252; margin-bottom: 14px; line-height: 1.6;">${pin.description}</p>` : ''}
        <audio controls src="/api/audio/${pin.audioFile}" style="width: 100%; height: 40px; margin-bottom: 12px;" preload="none"></audio>
        <div style="font-size: 12px; color: #A3A3A3;">${formatRelativeTime(pin.createdAt)}</div>
      </div>
    `;

    const popup = new maplibregl.Popup({
      offset: 28,
      closeButton: true,
      closeOnClick: false,
      maxWidth: '340px',
    }).setHTML(popupContent);

    popupsRef.current.set(pin.id, popup);

    const markerEl = createMarkerElement();
    markerEl.addEventListener('click', () => {
      closeAllPopups();
    });

    const marker = new maplibregl.Marker({ element: markerEl })
      .setLngLat([pin.lng, pin.lat])
      .setPopup(popup)
      .addTo(map);

    markersRef.current.set(pin.id, marker);
  }, [createMarkerElement, closeAllPopups]);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [collection.center.lng, collection.center.lat],
      zoom: 12,
    });

    mapInstance.current = map;

    map.on('click', (e) => {
      const target = e.originalEvent.target as HTMLElement;
      if (!target.closest('.custom-marker') && !target.closest('.maplibregl-popup')) {
        closeAllPopups();
      }
    });

    map.on('load', () => {
      collection.pins.forEach((pin) => addMarkerForPin(pin, map));

      if (collection.pins.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        collection.pins.forEach((pin) => bounds.extend([pin.lng, pin.lat]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
      }
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [collection, addMarkerForPin, closeAllPopups]);

  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => {
        mapInstance.current?.resize();
      }, 300);
    }
  }, [showPinsList]);

  const handlePinClick = (pin: Pin) => {
    if (!mapInstance.current) return;

    closeAllPopups();

    mapInstance.current.flyTo({
      center: [pin.lng, pin.lat],
      zoom: 15,
      duration: 800,
    });

    setTimeout(() => {
      const marker = markersRef.current.get(pin.id);
      if (marker) marker.togglePopup();
    }, 800);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background">
      {/* Map */}
      <div className="relative h-[50vh] lg:h-full flex-1 transition-all duration-250">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Header overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
          <motion.div
            className="px-5 py-4 pointer-events-auto rounded-2xl border border-border"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            }}
            initial={prefersReducedMotion ? false : { opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={spring}
          >
            <div className="flex items-center gap-2 text-muted mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              <span className="text-sm font-medium">Audio Pins</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">{collection.name}</h1>
            <p className="text-sm text-muted-light mt-0.5">
              {collection.pinCount} {collection.pinCount === 1 ? 'pin' : 'pins'}
              {collection.creator?.name && (
                <span> by <a href={`/u/${collection.creator.id}`} className="text-muted hover:text-foreground transition-colors">{collection.creator.name}</a></span>
              )}
            </p>
          </motion.div>

          <motion.div
            className="flex items-center gap-2 pointer-events-auto"
            initial={prefersReducedMotion ? false : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: 0.1 }}
          >
            {!showPinsList && (
              <button
                onClick={() => setShowPinsList(true)}
                className="w-10 h-10 rounded-full bg-white border border-border hover:bg-surface-hover transition-all duration-200 flex items-center justify-center"
                style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}
                aria-label="Show pins list"
              >
                <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Pin List */}
      <AnimatePresence>
        {showPinsList && (
          <motion.div
            className="w-full lg:w-[400px] overflow-hidden flex flex-col border-t lg:border-t-0 lg:border-l border-border bg-white"
            style={{ flexShrink: 0 }}
            initial={prefersReducedMotion ? false : { x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { x: 400, opacity: 0 }}
            transition={spring}
          >
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground tracking-tight">All Pins</h2>
              <button
                onClick={() => setShowPinsList(false)}
                className="w-9 h-9 text-muted hover:text-foreground rounded-full hover:bg-surface-hover flex items-center justify-center transition-all duration-200"
                aria-label="Close pins list"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {collection.pins.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                  <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mb-5">
                    <svg className="w-8 h-8 text-muted-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-foreground text-lg mb-1">No pins yet</h3>
                  <p className="text-sm text-muted">This collection doesn&apos;t have any pins.</p>
                </div>
              ) : (
                <motion.ul
                  className="divide-y divide-border"
                  variants={listContainer}
                  initial="hidden"
                  animate="show"
                >
                  {collection.pins.map((pin) => (
                    <motion.li key={pin.id} variants={listItem}>
                      <button
                        onClick={() => handlePinClick(pin)}
                        className="w-full px-6 py-4 text-left hover:bg-surface-hover transition-all duration-200 outline-none"
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlayingPinId(pin.id === playingPinId ? null : pin.id);
                            }}
                            className="flex-shrink-0 w-10 h-10 bg-surface-hover hover:bg-border rounded-full flex items-center justify-center transition-all duration-200"
                            aria-label={playingPinId === pin.id ? 'Pause' : 'Play'}
                          >
                            {playingPinId === pin.id ? (
                              <svg className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-foreground ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            {(pin.thumbnailFile || pin.photoFile) && (
                              <div className="relative w-full h-32 mb-2 rounded-lg overflow-hidden">
                                <img
                                  src={`/api/photos/${pin.thumbnailFile || pin.photoFile}`}
                                  alt={pin.title || 'Pin photo'}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <h3 className="font-medium text-foreground text-base truncate">
                              {pin.title || 'Untitled Pin'}
                            </h3>
                            {pin.description && (
                              <p className="text-sm text-muted truncate mt-1">{pin.description}</p>
                            )}
                            <div className="text-xs text-muted-light mt-1.5">
                              {formatRelativeTime(pin.createdAt)}
                            </div>
                          </div>

                          <svg className="w-4 h-4 text-muted-light flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </button>

                      {playingPinId === pin.id && (
                        <div className="px-6 pb-4">
                          <audio
                            controls
                            autoPlay
                            src={`/api/audio/${pin.audioFile}`}
                            className="w-full"
                            onEnded={() => setPlayingPinId(null)}
                          />
                        </div>
                      )}
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
