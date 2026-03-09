'use client';

import { useCallback, useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Pin } from './RecordingModal';
import { formatDistance, estimateTourDistance } from '../utils/tourUtils';
import { formatDuration, isRecentPin } from '../utils/pinUtils';

interface TourPanelProps {
  pins: Pin[];
  onClose: () => void;
  onPinClick?: (pin: Pin) => void;
}

function useCountUp(target: number, duration: number = 600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

export default function TourPanel({ pins, onClose, onPinClick }: TourPanelProps) {
  const [playingPinId, setPlayingPinId] = useState<string | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});
  const totalDistance = estimateTourDistance(pins);
  const animatedStops = useCountUp(pins.length);
  const animatedDistance = useCountUp(Math.round(totalDistance));
  const estimatedMinutes = Math.round(totalDistance / 80); // ~80m/min walking

  const handlePlayAudio = (pinId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayingPinId(pinId === playingPinId ? null : pinId);
  };

  const handleAudioMetadata = useCallback((pinId: string, duration: number) => {
    if (!Number.isFinite(duration)) return;
    setAudioDurations((prev) => (
      prev[pinId] === duration ? prev : { ...prev, [pinId]: duration }
    ));
  }, []);

  return (
    <motion.div
      className="w-[400px] h-full flex flex-col"
      style={{
        flexShrink: 0,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(0,0,0,0.06)',
      }}
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      {/* Header */}
      <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-start justify-between">
          <div>
            <span className="section-label">Trail Info</span>
            <h2 className="font-heading text-2xl text-foreground mt-1">Walking Tour</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 -mr-1 text-muted hover:text-foreground rounded-full hover:bg-surface-hover flex items-center justify-center transition-all duration-200"
            aria-label="Close tour panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-4">
          <div>
            <span className="font-heading text-3xl text-foreground">{animatedStops}</span>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-light mt-0.5">
              {pins.length === 1 ? 'Stop' : 'Stops'}
            </p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <span className="font-heading text-3xl text-foreground">{formatDistance(animatedDistance)}</span>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-light mt-0.5">Distance</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <span className="font-heading text-3xl text-foreground">{estimatedMinutes}</span>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-light mt-0.5">Min</p>
          </div>
        </div>
      </div>

      {/* Tour Stops */}
      <div className="flex-1 overflow-y-auto">
        {pins.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-14 h-14 bg-surface-hover rounded-full flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-muted-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-foreground mb-1">No stops in this area</h3>
            <p className="text-sm text-muted">Try selecting a larger area with more pins</p>
          </div>
        ) : (
          <ul className="py-3">
            {pins.map((pin, index) => (
              <motion.li
                key={pin.id}
                className="relative"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
              >
                {/* Connection line - dashed */}
                {index < pins.length - 1 && (
                  <div
                    className="absolute left-[37px] top-14 bottom-0 w-px"
                    style={{
                      height: 'calc(100% - 56px)',
                      backgroundImage: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 4px, transparent 4px, transparent 8px)',
                    }}
                  />
                )}

                <button
                  onClick={() => onPinClick?.(pin)}
                  className="w-full px-6 py-4 text-left hover:bg-white/60 transition-all duration-200 relative"
                >
                  <div className="flex items-start gap-4">
                    {/* Stop Number */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs z-10"
                         style={{ background: '#c8e636', color: '#1a1a1a' }}>
                      {index + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-12">
                      {pin.photoFile && (
                        <div className="relative w-full h-24 mb-2">
                          <Image
                            src={`/api/photos/${pin.photoFile}`}
                            alt={pin.title || 'Pin photo'}
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground text-base truncate flex-1">
                          {pin.title || 'Untitled Pin'}
                        </h3>
                        {isRecentPin(pin.createdAt) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{ background: '#c8e636', color: '#1a1a1a' }}>
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-light mt-1 font-mono">
                        {formatDuration(audioDurations[pin.id] ?? 0)}
                      </p>
                      {pin.description && (
                        <p className="text-sm text-muted mt-1 line-clamp-2">
                          {pin.description}
                        </p>
                      )}
                      {pin.transcript && (
                        <p className="text-xs text-muted-light mt-2 line-clamp-2 italic">
                          &ldquo;{pin.transcript}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Play Button */}
                    <motion.button
                      onClick={(e) => handlePlayAudio(pin.id, e)}
                      className="absolute right-6 top-4 flex-shrink-0 w-10 h-10 rounded-full
                               flex items-center justify-center transition-all duration-200"
                      style={{
                        background: playingPinId === pin.id ? '#c8e636' : 'rgba(0,0,0,0.04)',
                        color: '#1a1a1a',
                      }}
                      aria-label={playingPinId === pin.id ? 'Pause' : 'Play audio'}
                      animate={playingPinId === pin.id ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                      transition={playingPinId === pin.id ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
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
                    </motion.button>
                  </div>

                  {/* Audio Player */}
                  {playingPinId === pin.id && (
                    <div className="mt-4 ml-11">
                      <audio
                        controls
                        autoPlay
                        src={`/api/audio/${pin.audioFile}`}
                        className="w-full"
                        onEnded={() => setPlayingPinId(null)}
                      />
                    </div>
                  )}
                </button>

                <audio
                  className="hidden"
                  preload="metadata"
                  src={`/api/audio/${pin.audioFile}`}
                  onLoadedMetadata={(e) => handleAudioMetadata(pin.id, e.currentTarget.duration)}
                />
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: 'rgba(245,243,239,0.5)' }}>
        <div className="flex items-center gap-2.5 text-sm text-muted">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
          </svg>
          <span>Click a stop to view on map</span>
        </div>
      </div>
    </motion.div>
  );
}
