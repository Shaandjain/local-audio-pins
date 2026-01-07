'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Pin } from './RecordingModal';
import { formatDistance, estimateTourDistance } from '../utils/tourUtils';

interface TourPanelProps {
  pins: Pin[];
  onClose: () => void;
  onPinClick?: (pin: Pin) => void;
}

export default function TourPanel({ pins, onClose, onPinClick }: TourPanelProps) {
  const [playingPinId, setPlayingPinId] = useState<string | null>(null);
  const totalDistance = estimateTourDistance(pins);

  const handlePlayAudio = (pinId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayingPinId(pinId === playingPinId ? null : pinId);
  };

  return (
    <div
      className="w-[400px] h-full bg-white border-l border-border flex flex-col animate-slide-in-right"
      style={{ flexShrink: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-foreground tracking-tight">Your Walking Tour</h2>
          <p className="text-sm text-muted-light mt-1">
            {pins.length} {pins.length === 1 ? 'stop' : 'stops'} · {formatDistance(totalDistance)}
          </p>
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
              <li key={pin.id} className="relative">
                {/* Connection line */}
                {index < pins.length - 1 && (
                  <div
                    className="absolute left-[37px] top-14 bottom-0 w-px bg-border"
                    style={{ height: 'calc(100% - 56px)' }}
                  />
                )}

                <button
                  onClick={() => onPinClick?.(pin)}
                  className="w-full px-6 py-4 text-left hover:bg-surface-hover transition-all duration-200 relative"
                >
                  <div className="flex items-start gap-4">
                    {/* Stop Number */}
                    <div className="flex-shrink-0 w-7 h-7 bg-foreground text-white rounded-full flex items-center justify-center font-semibold text-xs z-10">
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
                      <h3 className="font-medium text-foreground text-base">
                        {pin.title || 'Untitled Pin'}
                      </h3>
                      {pin.description && (
                        <p className="text-sm text-muted mt-1 line-clamp-2">
                          {pin.description}
                        </p>
                      )}
                      {pin.transcript && (
                        <p className="text-xs text-muted-light mt-2 line-clamp-2 italic">
                          "{pin.transcript}"
                        </p>
                      )}
                    </div>

                    {/* Play Button */}
                    <button
                      onClick={(e) => handlePlayAudio(pin.id, e)}
                      className="absolute right-6 top-4 flex-shrink-0 w-10 h-10 bg-surface-hover hover:bg-border rounded-full
                               flex items-center justify-center transition-all duration-200"
                      aria-label={playingPinId === pin.id ? 'Pause' : 'Play audio'}
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
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border bg-surface-hover/30 flex-shrink-0">
        <div className="flex items-center gap-2.5 text-sm text-muted">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
          </svg>
          <span>Click a stop to view on map</span>
        </div>
      </div>
    </div>
  );
}
