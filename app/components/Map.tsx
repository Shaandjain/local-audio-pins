'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import RecordingModal, { Pin } from './RecordingModal';
import Header from './Header';
import HintPill from './HintPill';
import SelectionPanel from './SelectionPanel';
import TourPanel from './TourPanel';
import { BoundingBox, getPinsInBounds, generateWalkingTour } from '../utils/tourUtils';

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

  const addMarkerForPin = useCallback((pin: Pin) => {
    if (!mapInstance.current) return;

    const popupContent = `
      <div style="padding: 20px; min-width: 260px; max-width: 300px;">
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
          preload="none"
        ></audio>
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #A3A3A3;">
          <span>${formatRelativeTime(pin.createdAt)}</span>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px;">${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}</span>
        </div>
      </div>
    `;

    const popup = new maplibregl.Popup({
      offset: 28,
      closeButton: true,
      closeOnClick: false,
      maxWidth: '340px',
    }).setHTML(popupContent);

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
  }, [createMarkerElement, closeAllPopups]);

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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
      markersRef.current.clear();
    }

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-79.3832, 43.6532],
      zoom: 12,
    });

    mapInstance.current = map;

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
      map.remove();
      mapInstance.current = null;
      markersRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeAllPopups]); // selectionMode removed - using ref instead to avoid map reinitialization

  // Add markers when pins change
  useEffect(() => {
    if (!mapInstance.current) return;

    const addMarkers = () => {
      pins.forEach((pin) => {
        if (!markersRef.current.has(pin.id)) {
          addMarkerForPin(pin);
        }
      });
    };

    if (mapInstance.current.loaded()) {
      addMarkers();
    } else {
      mapInstance.current.on('load', addMarkers);
    }
  }, [pins, addMarkerForPin]);

  const handleCloseModal = () => {
    setClickedLocation(null);
  };

  const handleSavePin = (pin: Pin) => {
    setPins((prev) => [...prev, pin]);
    addMarkerForPin(pin);
    setShowHint(false);
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
    <div className="relative w-screen h-screen flex">
      {/* Main map area */}
      <div className="relative flex-1 transition-all duration-250">
        <Header
          selectionMode={selectionMode}
          onSelectionModeChange={handleSelectionModeChange}
        />

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

        {clickedLocation && !selectionMode && (
          <RecordingModal
            lat={clickedLocation.lat}
            lng={clickedLocation.lng}
            onClose={handleCloseModal}
            onSave={handleSavePin}
          />
        )}
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
