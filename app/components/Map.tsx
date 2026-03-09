'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AnimatePresence } from 'framer-motion';
import RecordingModal, { Pin } from './RecordingModal';
import Header from './Header';
import HintPill from './HintPill';
import SelectionPanel from './SelectionPanel';
import TourPanel from './TourPanel';
import Toast from './Toast';
import CategoryFilter from './CategoryFilter';
import { BoundingBox, getPinsInBounds, generateWalkingTour } from '../utils/tourUtils';
import { formatDuration } from '../utils/pinUtils';
import {
  getSavedLocation,
  requestGeolocation,
  reverseGeocode,
  DEFAULT_POSITION,
  DEFAULT_ZOOM,
  LOCATED_ZOOM,
} from '../utils/geolocation';

interface ClickedLocation {
  lat: number;
  lng: number;
}

interface DragState {
  startX: number;
  startY: number;
  startLng: number;
  startLat: number;
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

export default function MapView() {
  const searchParams = useSearchParams();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<globalThis.Map<string, maplibregl.Marker>>(new globalThis.Map());
  const [clickedLocation, setClickedLocation] = useState<ClickedLocation | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [showHint, setShowHint] = useState(true);
  const [showToast, setShowToast] = useState(false);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const selectionModeRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number } | null>(null);
  const [showTourPanel, setShowTourPanel] = useState(false);
  const [tourPins, setTourPins] = useState<Pin[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Category filter state
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // Geolocation state
  const [locationName, setLocationName] = useState<string | null>(null);
  const reverseGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if coming from collection page with hint param
  const showAddPinHint = searchParams.get('hint') === 'add';

  // Fix 1: Close all popups
  const closeAllPopups = useCallback(() => {
    markersRef.current.forEach((marker) => {
      const popup = marker.getPopup();
      if (popup?.isOpen()) {
        popup.remove();
      }
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

  const attachPopupHandlers = useCallback((popup: maplibregl.Popup, pin: Pin) => {
    popup.on('open', () => {
      const popupEl = popup.getElement();
      if (!popupEl) return;

      const audioEl = popupEl.querySelector('audio') as HTMLAudioElement | null;
      const durationEl = popupEl.querySelector('[data-duration]') as HTMLElement | null;

      if (audioEl && durationEl) {
        const updateDuration = () => {
          if (!Number.isFinite(audioEl.duration)) return;
          durationEl.textContent = formatDuration(audioEl.duration);
        };

        if (audioEl.readyState >= 1) {
          updateDuration();
        } else {
          audioEl.addEventListener('loadedmetadata', updateDuration, { once: true });
        }
      }

      const shareButton = popupEl.querySelector('[data-share]') as HTMLButtonElement | null;
      if (shareButton && !shareButton.dataset.bound) {
        shareButton.dataset.bound = 'true';
        const defaultLabel = shareButton.textContent || 'Share';

        shareButton.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();

          const origin = window.location.origin;
          const shareUrl = `${origin}/c/default?pin=${encodeURIComponent(pin.id)}`;

          try {
            await navigator.clipboard.writeText(shareUrl);
            shareButton.textContent = 'Copied!';
            shareButton.disabled = true;
            shareButton.style.opacity = '0.7';

            window.setTimeout(() => {
              shareButton.textContent = defaultLabel;
              shareButton.disabled = false;
              shareButton.style.opacity = '1';
            }, 2000);
          } catch (err) {
            console.error('Failed to copy share URL:', err);
          }
        });
      }
    });
  }, [formatDuration]);

  const addMarkerForPin = useCallback((pin: Pin) => {
    if (!mapInstance.current) return;

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
        ${pin.description ? `
          <p style="font-size: 14px; color: #525252; margin-bottom: 14px; line-height: 1.6;">
            ${pin.description}
          </p>
        ` : ''}
        <audio
          controls
          src="/api/audio/${pin.audioFile}"
          style="width: 100%; height: 40px; margin-bottom: 12px;"
          preload="metadata"
        ></audio>
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #A3A3A3;">
          <span>${formatRelativeTime(pin.createdAt)}</span>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span data-duration style="font-family: 'JetBrains Mono', monospace; font-size: 11px;">${formatDuration(0)}</span>
            <button
              type="button"
              data-share
              style="border: 1px solid #E5E5E5; background: #FFFFFF; padding: 4px 8px; border-radius: 999px; font-size: 11px; color: #0A0A0A; cursor: pointer;"
            >Share</button>
          </div>
        </div>
        <div style="margin-top: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #A3A3A3;">
          ${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}
        </div>
      </div>
    `;

    const popup = new maplibregl.Popup({
      offset: 28,
      closeButton: true,
      closeOnClick: false,
      maxWidth: '340px',
    }).setHTML(popupContent);

    attachPopupHandlers(popup, pin);

    const markerEl = createMarkerElement();

    // Fix 1: Close other popups when this marker is clicked
    markerEl.addEventListener('click', () => {
      closeAllPopups();
    });

    const marker = new maplibregl.Marker({ element: markerEl })
      .setLngLat([pin.lng, pin.lat])
      .setPopup(popup)
      .addTo(mapInstance.current);

    markersRef.current.set(pin.id, marker);
  }, [attachPopupHandlers, createMarkerElement, closeAllPopups]);

  // Load existing pins on mount
  useEffect(() => {
    const loadPins = async () => {
      try {
        const response = await fetch('/api/collections/default/pins');
        if (response.ok) {
          const existingPins: Pin[] = await response.json();
          setPins(existingPins);
          if (existingPins.length > 0 && !showAddPinHint) {
            setShowHint(false);
          }
        }
      } catch (err) {
        console.error('Error loading pins:', err);
      }
    };

    loadPins();
  }, [showAddPinHint]);

  // Viewport-based pin loading (debounced)
  const viewportLoadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedBoundsRef = useRef<string | null>(null);

  const loadViewportPins = useCallback(() => {
    if (!mapInstance.current) return;

    if (viewportLoadTimer.current) {
      clearTimeout(viewportLoadTimer.current);
    }

    viewportLoadTimer.current = setTimeout(async () => {
      const map = mapInstance.current;
      if (!map) return;

      const bounds = map.getBounds();
      const boundsKey = `${bounds.getSouth().toFixed(3)},${bounds.getWest().toFixed(3)},${bounds.getNorth().toFixed(3)},${bounds.getEast().toFixed(3)}`;

      // Skip if we already loaded these bounds
      if (loadedBoundsRef.current === boundsKey) return;
      loadedBoundsRef.current = boundsKey;

      try {
        const params = new URLSearchParams({
          north: bounds.getNorth().toString(),
          south: bounds.getSouth().toString(),
          east: bounds.getEast().toString(),
          west: bounds.getWest().toString(),
          limit: '50',
        });
        const res = await fetch(`/api/search?${params}`);
        if (res.ok) {
          const data = await res.json();
          // Merge viewport pins with existing pins (avoid duplicates)
          setPins((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPins = data.pins
              .filter((p: { id: string }) => !existingIds.has(p.id))
              .map((p: { id: string; title: string; description: string; lat: number; lng: number; category: string; thumbnailFile?: string; createdAt: string }) => ({
                id: p.id,
                lat: p.lat,
                lng: p.lng,
                title: p.title,
                description: p.description,
                transcript: '',
                audioFile: '',
                category: p.category,
                thumbnailFile: p.thumbnailFile,
                createdAt: p.createdAt,
              }));
            return newPins.length > 0 ? [...prev, ...newPins] : prev;
          });
        }
      } catch {
        // ignore viewport load errors
      }
    }, 500);
  }, []);

  // Reverse geocode the current map center (debounced)
  const updateLocationName = useCallback((lat: number, lng: number) => {
    if (reverseGeocodeTimer.current) {
      clearTimeout(reverseGeocodeTimer.current);
    }

    reverseGeocodeTimer.current = setTimeout(async () => {
      const name = await reverseGeocode(lat, lng);
      setLocationName(name);
    }, 1000);
  }, []);

  // Handle flying to a searched location
  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    if (!mapInstance.current) return;
    mapInstance.current.flyTo({
      center: [lng, lat],
      zoom: LOCATED_ZOOM,
      duration: 1500,
    });
  }, []);

  // Initialize map with geolocation
  useEffect(() => {
    if (!mapContainer.current) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
      markersRef.current.clear();
    }

    // Determine initial position from cache or default
    const saved = getSavedLocation();
    const initialCenter = saved
      ? { lng: saved.lng, lat: saved.lat }
      : { lng: DEFAULT_POSITION.lng, lat: DEFAULT_POSITION.lat };
    const initialZoom = saved ? LOCATED_ZOOM : DEFAULT_ZOOM;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialZoom,
    });

    mapInstance.current = map;

    // Request fresh geolocation
    requestGeolocation()
      .then((pos) => {
        if (saved) {
          // Only fly if significantly different (> ~5km)
          const dlat = Math.abs(pos.lat - saved.lat);
          const dlng = Math.abs(pos.lng - saved.lng);
          if (dlat > 0.05 || dlng > 0.05) {
            map.flyTo({ center: [pos.lng, pos.lat], zoom: LOCATED_ZOOM, duration: 1500 });
          }
        } else {
          map.flyTo({ center: [pos.lng, pos.lat], zoom: LOCATED_ZOOM, duration: 1500 });
        }
      })
      .catch(() => {
        // Geolocation denied or unavailable - stay on current view
      })
;

    // Reverse geocode initial position
    updateLocationName(initialCenter.lat, initialCenter.lng);

    // Update location name and load viewport pins when map stops moving
    map.on('moveend', () => {
      const center = map.getCenter();
      updateLocationName(center.lat, center.lng);
      loadViewportPins();
    });

    // Fix 1: Close popups when clicking on empty map area
    map.on('click', (e) => {
      const target = e.originalEvent.target as HTMLElement;
      if (target.closest('.custom-marker') || target.closest('.maplibregl-popup')) {
        return;
      }

      // Close all popups when clicking empty area
      closeAllPopups();

      // Only open recording modal if not in selection mode (use ref to avoid stale closure)
      if (!selectionModeRef.current) {
        setClickedLocation({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        });
      }
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'bottom-right'
    );

    return () => {
      if (reverseGeocodeTimer.current) {
        clearTimeout(reverseGeocodeTimer.current);
      }
      if (viewportLoadTimer.current) {
        clearTimeout(viewportLoadTimer.current);
      }
      map.remove();
      mapInstance.current = null;
      markersRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeAllPopups, updateLocationName, loadViewportPins]); // selectionMode removed - using ref instead to avoid map reinitialization

  // Add markers when pins change, filter by category
  useEffect(() => {
    if (!mapInstance.current) return;

    const syncMarkers = () => {
      pins.forEach((pin) => {
        const pinCategory = (pin.category || 'GENERAL').toUpperCase();
        const visible = selectedCategories.size === 0 || selectedCategories.has(pinCategory);

        if (visible) {
          if (!markersRef.current.has(pin.id)) {
            addMarkerForPin(pin);
          } else {
            const marker = markersRef.current.get(pin.id)!;
            marker.getElement().style.display = '';
          }
        } else {
          const marker = markersRef.current.get(pin.id);
          if (marker) {
            const popup = marker.getPopup();
            if (popup?.isOpen()) popup.remove();
            marker.getElement().style.display = 'none';
          }
        }
      });
    };

    if (mapInstance.current.loaded()) {
      syncMarkers();
    } else {
      mapInstance.current.on('load', syncMarkers);
    }
  }, [pins, addMarkerForPin, selectedCategories]);

  const handleCloseModal = () => {
    setClickedLocation(null);
  };

  const handleSavePin = (pin: Pin) => {
    setPins((prev) => [...prev, pin]);
    addMarkerForPin(pin);
    setShowHint(false);
    setShowToast(true);
  };

  // Fix 2: Selection mode handlers with easy exit
  // Keep scroll zoom enabled so users can navigate to any area before drawing
  const handleSelectionModeChange = (enabled: boolean) => {
    setSelectionMode(enabled);
    selectionModeRef.current = enabled; // Keep ref in sync
    closeAllPopups(); // Close popups when entering/exiting selection mode

    if (!enabled) {
      clearSelection();
      setShowTourPanel(false);
    }

    if (mapInstance.current) {
      if (enabled) {
        // Only disable drag pan - keep scroll zoom so users can navigate
        mapInstance.current.dragPan.disable();
        mapInstance.current.doubleClickZoom.disable();
        // scrollZoom stays enabled for navigation
      } else {
        mapInstance.current.dragPan.enable();
        mapInstance.current.doubleClickZoom.enable();
      }
    }
  };

  const exitSelectionMode = () => {
    handleSelectionModeChange(false);
  };

  const clearSelection = () => {
    setBoundingBox(null);
    setDragState(null);
    setCurrentMousePos(null);
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectionMode || !mapInstance.current) return;

    const rect = mapContainer.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lngLat = mapInstance.current.unproject([x, y]);

    setDragState({
      startX: x,
      startY: y,
      startLng: lngLat.lng,
      startLat: lngLat.lat,
    });
    setIsDragging(true);
    setBoundingBox(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragState || !mapInstance.current) return;

    const rect = mapContainer.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentMousePos({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging || !dragState || !mapInstance.current) return;

    const rect = mapContainer.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lngLat = mapInstance.current.unproject([x, y]);

    const box: BoundingBox = {
      north: Math.max(dragState.startLat, lngLat.lat),
      south: Math.min(dragState.startLat, lngLat.lat),
      east: Math.max(dragState.startLng, lngLat.lng),
      west: Math.min(dragState.startLng, lngLat.lng),
    };

    setBoundingBox(box);
    setIsDragging(false);
    setDragState(null);
    setCurrentMousePos(null);
  };

  const handleGenerateTour = () => {
    if (!boundingBox) return;

    setIsGenerating(true);

    setTimeout(() => {
      const pinsInArea = getPinsInBounds(pins, boundingBox);
      const orderedPins = generateWalkingTour(pinsInArea, 'north');
      setTourPins(orderedPins);
      setShowTourPanel(true);
      setIsGenerating(false);
    }, 500);
  };

  const handleCloseTourPanel = () => {
    setShowTourPanel(false);
    clearSelection();
    handleSelectionModeChange(false); // Fix 2: Exit selection mode after closing tour
  };

  const handleTourPinClick = (pin: Pin) => {
    if (!mapInstance.current) return;

    closeAllPopups();

    mapInstance.current.flyTo({
      center: [pin.lng, pin.lat],
      zoom: 15,
      duration: 800,
    });

    setTimeout(() => {
      const marker = markersRef.current.get(pin.id);
      if (marker) {
        marker.togglePopup();
      }
    }, 800);
  };

  const pinsInBounds = boundingBox ? getPinsInBounds(pins, boundingBox) : [];

  const getBoxStyle = (): React.CSSProperties | null => {
    if (!mapInstance.current || !mapContainer.current) return null;

    let startX: number, startY: number, endX: number, endY: number;

    if (isDragging && dragState && currentMousePos) {
      startX = dragState.startX;
      startY = dragState.startY;
      endX = currentMousePos.x;
      endY = currentMousePos.y;
    } else if (boundingBox) {
      const sw = mapInstance.current.project([boundingBox.west, boundingBox.south]);
      const ne = mapInstance.current.project([boundingBox.east, boundingBox.north]);
      startX = sw.x;
      startY = ne.y;
      endX = ne.x;
      endY = sw.y;
    } else {
      return null;
    }

    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  const boxStyle = getBoxStyle();

  return (
    <div className="relative w-screen h-screen flex map-fullscreen">
      {/* Main map area */}
      <div className="relative flex-1 transition-all duration-250">
        <Header
          selectionMode={selectionMode}
          onSelectionModeChange={handleSelectionModeChange}
          locationName={locationName}
          onLocationSelect={handleLocationSelect}
          onPinSelect={(lat, lng, pinId) => {
            if (!mapInstance.current) return;
            closeAllPopups();
            mapInstance.current.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
            setTimeout(() => {
              const marker = markersRef.current.get(pinId);
              if (marker) marker.togglePopup();
            }, 800);
          }}
        />

        {/* Category filter chips */}
        {!selectionMode && (
          <div
            className="absolute top-16 left-0 right-0 z-10"
            style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, transparent 100%)',
            }}
          >
            <CategoryFilter selected={selectedCategories} onChange={setSelectedCategories} />
          </div>
        )}

        <div ref={mapContainer} className="w-full h-full" />

        {/* Selection overlay */}
        {selectionMode && !showTourPanel && (
          <div
            className="absolute inset-0 cursor-crosshair z-10"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (isDragging) {
                setIsDragging(false);
                setDragState(null);
                setCurrentMousePos(null);
              }
            }}
          />
        )}

        {/* Bounding box overlay - sharp corners for cartographic feel */}
        {boxStyle && !showTourPanel && (
          <div
            className="absolute pointer-events-none z-20 selection-box"
            style={boxStyle}
          />
        )}

        {/* Exit selection button */}
        {selectionMode && !showTourPanel && (
          <button
            onClick={exitSelectionMode}
            className="absolute top-20 right-4 z-30 bg-white rounded-full px-4 py-2.5 flex items-center gap-2 hover:bg-surface-hover transition-all duration-200 border border-border"
            style={{ boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)' }}
          >
            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm font-medium text-foreground">Exit</span>
          </button>
        )}

        {/* Selection mode indicator */}
        {selectionMode && !boundingBox && !isDragging && !showTourPanel && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 animate-slide-up">
            <div className="bg-white rounded-2xl px-5 py-4 border border-border"
                 style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)' }}>
              <p className="text-sm font-medium text-foreground">Draw a selection</p>
              <p className="text-xs text-muted mt-1">Click and drag to select an area</p>
            </div>
          </div>
        )}

        {/* Selection panel */}
        {boundingBox && !showTourPanel && (
          <SelectionPanel
            pinCount={pinsInBounds.length}
            onGenerateTour={handleGenerateTour}
            onClear={clearSelection}
            onExit={exitSelectionMode}
            isGenerating={isGenerating}
          />
        )}

        {/* Fix 3: Show hint when coming from collection page */}
        <HintPill
          show={(showHint && pins.length === 0 && !selectionMode) || showAddPinHint}
          onDismiss={() => setShowHint(false)}
          message={showAddPinHint ? "Click anywhere on the map to drop a pin" : undefined}
        />

        <AnimatePresence>
          {clickedLocation && !selectionMode && (
            <RecordingModal
              lat={clickedLocation.lat}
              lng={clickedLocation.lng}
              onClose={handleCloseModal}
              onSave={handleSavePin}
            />
          )}
        </AnimatePresence>

        <Toast show={showToast} onDismiss={() => setShowToast(false)} />
      </div>

      {/* Fix 5: Tour side panel */}
      {showTourPanel && (
        <TourPanel
          pins={tourPins}
          onClose={handleCloseTourPanel}
          onPinClick={handleTourPinClick}
        />
      )}
    </div>
  );
}
