'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDuration, isRecentPin } from '../../utils/pinUtils';

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
  transcript: string;
  audioFile: string;
  photoFile?: string;
  thumbnailFile?: string;
  category?: string;
  createdAt: string;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  isPublic?: boolean;
  center: { lat: number; lng: number };
  pins: Pin[];
}

interface CollectionSummary {
  id: string;
  name: string;
  pinCount: number;
}

interface CollectionViewProps {
  collectionId: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  GENERAL: { bg: '#ffffff', border: '#888888', icon: '#888888' },
  FOOD: { bg: '#fff8eb', border: '#f59e0b', icon: '#f59e0b' },
  HISTORY: { bg: '#fef3c7', border: '#a16207', icon: '#a16207' },
  NATURE: { bg: '#f0fdf4', border: '#22c55e', icon: '#22c55e' },
  CULTURE: { bg: '#faf5ff', border: '#a855f7', icon: '#a855f7' },
  ARCHITECTURE: { bg: '#eff6ff', border: '#3b82f6', icon: '#3b82f6' },
};

const CATEGORY_ICONS: Record<string, string> = {
  GENERAL: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  FOOD: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
  HISTORY: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`,
  NATURE: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`,
  CULTURE: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><path d="M17.5 10.5c-1.5-1-3.5-1-5 0"/><path d="M3 19.5C3 10 10 3 19 3"/><path d="M3 13c3-5 8-8 14-8"/></svg>`,
  ARCHITECTURE: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`,
};

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

// --- Modal animation wrapper ---
const modalOverlayVariants = {
  hidden: { opacity: prefersReducedMotion ? 1 : 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalContentVariants = {
  hidden: { opacity: prefersReducedMotion ? 1 : 0, scale: prefersReducedMotion ? 1 : 0.92 },
  visible: { opacity: 1, scale: 1, transition: spring },
  exit: { opacity: 0, scale: prefersReducedMotion ? 1 : 0.92, transition: { duration: 0.15 } },
};

// --- Edit Modal ---
function EditModal({
  collection,
  onClose,
  onSave,
}: {
  collection: Collection;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description || '');

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      variants={modalOverlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="glass-card p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
        variants={modalContentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <span className="section-label">Edit</span>
        <h2 className="font-heading text-xl text-foreground mt-1 mb-4">Edit Collection</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="edit-desc" className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="textarea"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => onSave(name.trim(), description.trim())}
            disabled={!name.trim()}
            className="btn rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#c8e636', color: '#1a1a1a' }}
          >
            Save Changes
          </button>
          <button onClick={onClose} className="btn-secondary rounded-full">Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Delete Confirmation Modal ---
function DeleteModal({
  collectionName,
  onClose,
  onConfirm,
  isDeleting,
}: {
  collectionName: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      variants={modalOverlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="glass-card p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
        variants={modalContentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <h2 className="font-heading text-xl text-foreground mb-2">Delete Collection</h2>
        <p className="text-sm text-muted mb-6">
          Are you sure you want to delete <strong>{collectionName}</strong>? This will permanently remove all pins in this collection. This action cannot be undone.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full font-medium text-sm bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
          <button onClick={onClose} className="btn-secondary rounded-full">Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Pin Action Modal (Move/Copy) ---
function PinActionModal({
  pin,
  action,
  collections,
  onClose,
  onConfirm,
}: {
  pin: Pin;
  action: 'move' | 'copy';
  collections: CollectionSummary[];
  onClose: () => void;
  onConfirm: (targetId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedId) return;
    setLoading(true);
    await onConfirm(selectedId);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      variants={modalOverlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="glass-card p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
        variants={modalContentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <h2 className="font-heading text-xl text-foreground mb-1">
          {action === 'move' ? 'Move' : 'Copy'} Pin
        </h2>
        <p className="text-sm text-muted mb-4">
          {action === 'move' ? 'Move' : 'Copy'} &ldquo;{pin.title || 'Untitled Pin'}&rdquo; to:
        </p>

        {collections.length === 0 ? (
          <p className="text-sm text-muted-light py-4 text-center">No other collections available.</p>
        ) : (
          <ul className="space-y-1 max-h-60 overflow-y-auto mb-4">
            {collections.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    selectedId === c.id
                      ? 'text-foreground font-medium'
                      : 'hover:bg-white/60 text-foreground'
                  }`}
                  style={selectedId === c.id ? { background: '#c8e636' } : undefined}
                >
                  <span className="font-medium">{c.name}</span>
                  <span className={`ml-2 text-xs ${selectedId === c.id ? 'text-foreground/70' : 'text-muted-light'}`}>
                    {c.pinCount} {c.pinCount === 1 ? 'pin' : 'pins'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirm}
            disabled={!selectedId || loading}
            className="btn rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#c8e636', color: '#1a1a1a' }}
          >
            {loading ? (action === 'move' ? 'Moving...' : 'Copying...') : (action === 'move' ? 'Move' : 'Copy')}
          </button>
          <button onClick={onClose} className="btn-secondary rounded-full">Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CollectionView({ collectionId }: CollectionViewProps) {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<globalThis.Map<string, maplibregl.Marker>>(new globalThis.Map());
  const popupsRef = useRef<globalThis.Map<string, maplibregl.Popup>>(new globalThis.Map());
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingPinId, setPlayingPinId] = useState<string | null>(null);
  const [showPinsList, setShowPinsList] = useState(true);
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});

  // Management modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pin action state
  const [pinActionModal, setPinActionModal] = useState<{ pin: Pin; action: 'move' | 'copy' } | null>(null);
  const [otherCollections, setOtherCollections] = useState<CollectionSummary[]>([]);
  const [pinMenuId, setPinMenuId] = useState<string | null>(null);

  const handleAudioMetadata = useCallback((pinId: string, duration: number) => {
    if (!Number.isFinite(duration)) return;
    setAudioDurations((prev) => (
      prev[pinId] === duration ? prev : { ...prev, [pinId]: duration }
    ));
  }, []);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const response = await fetch(`/api/collections/${collectionId}`);
        if (!response.ok) throw new Error('Collection not found');
        const data: Collection = await response.json();
        setCollection(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load collection');
      } finally {
        setLoading(false);
      }
    };
    fetchCollection();
  }, [collectionId]);

  // Fetch other collections for move/copy
  const fetchOtherCollections = useCallback(async () => {
    try {
      const res = await fetch('/api/collections');
      if (!res.ok) return;
      const data = await res.json();
      setOtherCollections(
        data.collections
          .filter((c: CollectionSummary & { id: string }) => c.id !== collectionId)
          .map((c: CollectionSummary & { id: string }) => ({ id: c.id, name: c.name, pinCount: c.pinCount }))
      );
    } catch {
      // Silently fail
    }
  }, [collectionId]);

  const closeAllPopups = useCallback(() => {
    popupsRef.current.forEach((popup) => {
      if (popup.isOpen()) popup.remove();
    });
  }, []);

  const createMarkerElement = useCallback((category?: string) => {
    const cat = (category || 'GENERAL').toUpperCase();
    const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.GENERAL;
    const icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS.GENERAL;

    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: 38px;
          height: 38px;
          background: ${colors.bg};
          border-radius: 12px;
          border: 2.5px solid ${colors.border};
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          color: ${colors.icon};
        ">
          ${icon}
        </div>
        <div style="
          width: 2px;
          height: 10px;
          background: ${colors.border};
          border-radius: 1px;
          margin-top: -1px;
        "></div>
        <div style="
          width: 6px;
          height: 6px;
          background: ${colors.border};
          border-radius: 50%;
          margin-top: -1px;
          opacity: 0.5;
        "></div>
      </div>
    `;
    return el;
  }, []);

  const addMarkerForPin = useCallback((pin: Pin, map: maplibregl.Map) => {
    const cat = (pin.category || 'GENERAL').toUpperCase();
    const catColors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.GENERAL;

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
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${catColors.border}; flex-shrink: 0;"></div>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #999;">
            ${(pin.category || 'General')}
          </span>
        </div>
        <h3 style="font-weight: 600; color: #1a1a1a; font-size: 17px; margin-bottom: 6px; letter-spacing: -0.02em;">
          ${pin.title || 'Untitled Pin'}
        </h3>
        ${pin.description ? `<p style="font-size: 14px; color: #666; margin-bottom: 14px; line-height: 1.6;">${pin.description}</p>` : ''}
        <audio controls src="/api/audio/${pin.audioFile}" style="width: 100%; height: 40px; margin-bottom: 12px;" preload="none"></audio>
        <div style="font-size: 12px; color: #999;">${formatRelativeTime(pin.createdAt)}</div>
      </div>
    `;

    const popup = new maplibregl.Popup({
      offset: 38,
      closeButton: true,
      closeOnClick: false,
      maxWidth: '340px',
    }).setHTML(popupContent);

    popupsRef.current.set(pin.id, popup);

    const markerEl = createMarkerElement(pin.category);

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
    if (!collection || !mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [collection.center.lng, collection.center.lat],
      zoom: 12,
      pitch: 50,
      bearing: -10,
    });

    mapInstance.current = map;

    map.on('click', (e) => {
      const target = e.originalEvent.target as HTMLElement;
      if (!target.closest('.custom-marker') && !target.closest('.maplibregl-popup')) {
        closeAllPopups();
      }
    });

    map.on('load', () => {
      // Add 3D terrain
      map.addSource('terrain-dem', {
        type: 'raster-dem',
        url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
        tileSize: 256,
      });
      map.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 });

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

  const handlePlayAudio = (pinId: string) => {
    setPlayingPinId(pinId === playingPinId ? null : pinId);
  };

  // --- Collection Management Handlers ---

  const handleEditSave = async (name: string, description: string) => {
    if (!collection) return;
    try {
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setCollection({ ...collection, name, description });
      setShowEditModal(false);
    } catch {
      // Keep modal open on error
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete collection');
        setIsDeleting(false);
        return;
      }
      router.push('/collections');
    } catch {
      setIsDeleting(false);
    }
  };

  const handlePinAction = async (targetCollectionId: string) => {
    if (!pinActionModal || !collection) return;
    const { pin, action } = pinActionModal;

    const res = await fetch(`/api/pins/${pin.id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCollectionId }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || `Failed to ${action} pin`);
      return;
    }

    if (action === 'move') {
      setCollection({
        ...collection,
        pins: collection.pins.filter((p) => p.id !== pin.id),
      });
      const marker = markersRef.current.get(pin.id);
      if (marker) {
        marker.remove();
        markersRef.current.delete(pin.id);
      }
      popupsRef.current.delete(pin.id);
    }

    setPinActionModal(null);
    setPinMenuId(null);
  };

  const openPinAction = async (pin: Pin, action: 'move' | 'copy') => {
    await fetchOtherCollections();
    setPinActionModal({ pin, action });
    setPinMenuId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex items-center gap-3 text-muted">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading collection...</span>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-center px-4">
        <div className="w-14 h-14 bg-surface-hover rounded-full flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="font-heading text-3xl text-foreground mb-2">Collection not found</h1>
        <p className="text-muted mb-6">{error}</p>
        <Link href="/app" className="btn rounded-full font-semibold" style={{ background: '#c8e636', color: '#1a1a1a' }}>Go back home</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background map-fullscreen">
      {/* Map Section */}
      <div className="relative h-[50vh] lg:h-full flex-1 transition-all duration-250">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Header overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
          <div
            className="glass-card px-5 py-4 pointer-events-auto"
          >
            <Link href="/collections" className="flex items-center gap-2 text-muted hover:text-foreground transition-all duration-200 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span className="text-sm">My Collections</span>
            </Link>
            <span className="section-label">Collection</span>
            <h1 className="font-heading text-2xl text-foreground mt-1">{collection.name}</h1>
            <p className="text-sm text-muted-light mt-0.5">
              {collection.pins.length} {collection.pins.length === 1 ? 'pin' : 'pins'}
            </p>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Edit button */}
            <button
              onClick={() => setShowEditModal(true)}
              className="w-10 h-10 rounded-full bg-white/85 backdrop-blur-md hover:bg-white transition-all duration-200 flex items-center justify-center"
              style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', border: '1px solid rgba(0,0,0,0.06)' }}
              aria-label="Edit collection"
              title="Edit collection"
            >
              <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </button>

            {/* Delete button */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-10 h-10 rounded-full bg-white/85 backdrop-blur-md hover:bg-white transition-all duration-200 flex items-center justify-center"
              style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', border: '1px solid rgba(0,0,0,0.06)' }}
              aria-label="Delete collection"
              title="Delete collection"
            >
              <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>

            <Link
              href="/?hint=add"
              className="w-10 h-10 rounded-full bg-white/85 backdrop-blur-md hover:bg-white transition-all duration-200 flex items-center justify-center"
              style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', border: '1px solid rgba(0,0,0,0.06)' }}
              aria-label="Add new pin"
              title="Add new pin"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </Link>

            {!showPinsList && (
              <button
                onClick={() => setShowPinsList(true)}
                className="w-10 h-10 rounded-full bg-white/85 backdrop-blur-md hover:bg-white transition-all duration-200 flex items-center justify-center"
                style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', border: '1px solid rgba(0,0,0,0.06)' }}
                aria-label="Show pins list"
                title="Show pins list"
              >
                <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pin List Section */}
      <AnimatePresence>
        {showPinsList && (
          <motion.div
            className="w-full lg:w-[400px] overflow-hidden flex flex-col"
            style={{
              flexShrink: 0,
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderLeft: '1px solid rgba(0,0,0,0.06)',
            }}
            initial={prefersReducedMotion ? false : { x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { x: 400, opacity: 0 }}
            transition={spring}
          >
            {/* Header with close button */}
            <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div>
                <span className="section-label">Pins</span>
                <h2 className="font-heading text-xl text-foreground mt-1">All Pins</h2>
              </div>
              <button
                onClick={() => setShowPinsList(false)}
                className="w-9 h-9 text-muted hover:text-foreground rounded-full hover:bg-surface-hover flex items-center justify-center transition-all duration-200"
                aria-label="Close pins list"
                title="Close pins list"
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
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-foreground text-lg mb-1">No pins yet</h3>
                  <p className="text-sm text-muted mb-5">Be the first to add a voice note!</p>
                  <Link href="/?hint=add" className="btn rounded-full font-semibold" style={{ background: '#c8e636', color: '#1a1a1a' }}>Add a pin</Link>
                </div>
              ) : (
                <motion.ul
                  className="divide-y"
                  style={{ borderColor: 'rgba(0,0,0,0.04)' }}
                  variants={listContainer}
                  initial="hidden"
                  animate="show"
                >
                  {collection.pins.map((pin) => {
                    const cat = (pin.category || 'GENERAL').toUpperCase();
                    const catColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS.GENERAL;
                    return (
                    <motion.li key={pin.id} className="relative" variants={listItem}>
                      <button
                        onClick={() => handlePinClick(pin)}
                        className="w-full px-6 py-4 text-left hover:bg-white/60 transition-all duration-200 outline-none"
                      >
                        <div className="flex items-start gap-4">
                          {/* Play button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayAudio(pin.id);
                            }}
                            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
                            style={{
                              background: playingPinId === pin.id ? '#c8e636' : 'rgba(0,0,0,0.04)',
                              color: '#1a1a1a',
                            }}
                            aria-label={playingPinId === pin.id ? 'Pause' : 'Play'}
                          >
                            {playingPinId === pin.id ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            {(pin.thumbnailFile || pin.photoFile) && (
                              <div className="relative w-full h-32 mb-2">
                                <Image
                                  src={`/api/photos/${pin.thumbnailFile || pin.photoFile}`}
                                  alt={pin.title || 'Pin photo'}
                                  fill
                                  className="object-cover rounded-lg"
                                />
                              </div>
                            )}
                            <h3 className="font-medium text-foreground text-base">
                              <span className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ background: catColor.border }}
                                />
                                <span className="truncate flex-1">{pin.title || 'Untitled Pin'}</span>
                                {isRecentPin(pin.createdAt) && (
                                  <motion.span
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                                    style={{ background: '#c8e636', color: '#1a1a1a' }}
                                    animate={prefersReducedMotion ? {} : {
                                      boxShadow: [
                                        '0 0 0 0 rgba(200, 230, 54, 0)',
                                        '0 0 0 4px rgba(200, 230, 54, 0.2)',
                                        '0 0 0 0 rgba(200, 230, 54, 0)',
                                      ],
                                    }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                  >
                                    New
                                  </motion.span>
                                )}
                              </span>
                            </h3>
                            {pin.description && (
                              <p className="text-sm text-muted truncate mt-1">
                                {pin.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-xs text-muted-light mt-1.5">
                              <span>{formatRelativeTime(pin.createdAt)}</span>
                              <span className="font-mono">{formatDuration(audioDurations[pin.id] ?? 0)}</span>
                            </div>
                          </div>

                          {/* Pin context menu button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPinMenuId(pinMenuId === pin.id ? null : pin.id);
                            }}
                            className="flex-shrink-0 w-7 h-7 rounded-full hover:bg-white/80 flex items-center justify-center transition-colors mt-1"
                            aria-label="Pin options"
                          >
                            <svg className="w-4 h-4 text-muted-light" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                            </svg>
                          </button>
                        </div>
                      </button>

                      {/* Pin context menu */}
                      <AnimatePresence>
                        {pinMenuId === pin.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setPinMenuId(null)} />
                            <motion.div
                              className="absolute right-6 top-12 z-20 glass-card overflow-hidden"
                              style={{ minWidth: 140 }}
                              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.15 }}
                            >
                              <button
                                onClick={(e) => { e.stopPropagation(); openPinAction(pin, 'move'); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-white/60 transition-colors flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                </svg>
                                Move to...
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); openPinAction(pin, 'copy'); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-white/60 transition-colors flex items-center gap-2"
                                style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                              >
                                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                                </svg>
                                Copy to...
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>

                      <audio
                        className="hidden"
                        preload="metadata"
                        src={`/api/audio/${pin.audioFile}`}
                        onLoadedMetadata={(e) => handleAudioMetadata(pin.id, e.currentTarget.duration)}
                      />

                      {/* Audio element for playback */}
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
                    );
                  })}
                </motion.ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showEditModal && (
          <EditModal
            collection={collection}
            onClose={() => setShowEditModal(false)}
            onSave={handleEditSave}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <DeleteModal
            collectionName={collection.name}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDelete}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pinActionModal && (
          <PinActionModal
            pin={pinActionModal.pin}
            action={pinActionModal.action}
            collections={otherCollections}
            onClose={() => { setPinActionModal(null); setPinMenuId(null); }}
            onConfirm={handlePinAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
