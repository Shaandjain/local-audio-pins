'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getSupportedAudioMimeType,
  getAudioFileExtension,
  isSpeechRecognitionSupported,
  isMediaRecorderSupported,
} from '../utils/browserCapabilities';
import { savePendingPin, generateOfflineId } from '../utils/offlineQueue';

export interface Pin {
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

interface RecordingModalProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onSave: (pin: Pin) => void;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

const CATEGORY_OPTIONS = ['General', 'Food', 'History', 'Nature', 'Culture', 'Architecture'];

export default function RecordingModal({ lat, lng, onClose, onSave }: RecordingModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformDataRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef<string>('');
  const recordingMimeTypeRef = useRef<string>('audio/webm');

  const speechRecognitionAvailable = typeof window !== 'undefined' && isSpeechRecognitionSupported();
  const mediaRecorderAvailable = typeof window !== 'undefined' && isMediaRecorderSupported();

  const canSave = title.trim() && audioBlob && !isSaving;

  const resizeWaveformCanvas = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const { offsetWidth, offsetHeight } = canvas;
    canvas.width = offsetWidth * ratio;
    canvas.height = offsetHeight * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
  }, []);

  const drawIdleWaveform = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#D4D4D4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, []);

  const drawWaveform = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    const analyser = analyserRef.current;
    const dataArray = waveformDataRef.current;
    if (!canvas || !analyser || !dataArray) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, width, height);

    analyser.getByteTimeDomainData(dataArray);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0A0A0A';
    ctx.beginPath();

    const sliceWidth = width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
    animationFrameRef.current = window.requestAnimationFrame(drawWaveform);
  }, []);

  const startWaveform = useCallback((stream: MediaStream) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    waveformDataRef.current = new Uint8Array(analyser.fftSize);

    resizeWaveformCanvas();
    drawWaveform();
  }, [drawWaveform, resizeWaveformCanvas]);

  const stopWaveform = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    analyserRef.current = null;
    waveformDataRef.current = null;

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    drawIdleWaveform();
  }, [drawIdleWaveform]);

  useEffect(() => {
    const handleResize = () => {
      resizeWaveformCanvas();
      if (!isRecording) {
        drawIdleWaveform();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawIdleWaveform, isRecording, resizeWaveformCanvas]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      stopWaveform();
    };
  }, [audioUrl, photoUrl, stopWaveform]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image must be smaller than 10MB');
        return;
      }
      setPhotoFile(file);
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
      setPhotoUrl(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
    }
    setPhotoFile(null);
    setPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    if (!mediaRecorderAvailable) {
      alert('Audio recording is not supported in your browser. Please use Chrome, Firefox, Safari, or Edge.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const supportedMimeType = getSupportedAudioMimeType();
      const recorderOptions: MediaRecorderOptions = {};
      if (supportedMimeType) {
        recorderOptions.mimeType = supportedMimeType;
        recordingMimeTypeRef.current = supportedMimeType;
      } else {
        recordingMimeTypeRef.current = 'audio/webm';
      }

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      transcriptRef.current = '';
      setTranscript('');
      startWaveform(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = recordingMimeTypeRef.current;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      if (speechRecognitionAvailable) {
        const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsTranscribing(true);

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript + ' ';
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          if (finalTranscript) {
            transcriptRef.current += finalTranscript;
          }
          setTranscript(transcriptRef.current + interimTranscript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          if (event.error !== 'no-speech') {
            setIsTranscribing(false);
          }
        };

        recognition.onend = () => {
          setIsTranscribing(false);
          setTranscript(transcriptRef.current.trim());
        };

        speechRecognitionRef.current = recognition;
        recognition.start();
      }

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    stopWaveform();
  };

  const handleSave = async () => {
    if (!audioBlob || !title.trim()) return;

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append('lat', lat.toString());
      formData.append('lng', lng.toString());
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('transcript', transcript);
      const ext = getAudioFileExtension(recordingMimeTypeRef.current);
      formData.append('audio', audioBlob, `recording${ext}`);
      formData.append('category', category);
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const response = await fetch('/api/collections/default/pins', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save pin');
      }

      const pin: Pin = await response.json();
      onSave(pin);
      onClose();
    } catch (err) {
      console.error('Error saving pin:', err);
      // If offline or network error, save to IndexedDB queue
      if (!navigator.onLine || (err instanceof TypeError)) {
        try {
          const offlineId = generateOfflineId();
          await savePendingPin({
            id: offlineId,
            title: title.trim(),
            description: description.trim(),
            transcript,
            lat,
            lng,
            audioBlob,
            photoBlob: photoFile || undefined,
            photoName: photoFile?.name,
            category,
            createdAt: new Date().toISOString(),
            synced: false,
          });
          // Create a temporary pin for the UI
          const offlinePin: Pin = {
            id: offlineId,
            lat,
            lng,
            title: title.trim(),
            description: description.trim(),
            transcript,
            audioFile: '',
            category,
            createdAt: new Date().toISOString(),
          };
          onSave(offlinePin);
          onClose();
          return;
        } catch (dbErr) {
          console.error('Failed to save offline:', dbErr);
        }
      }
      alert('Failed to save pin. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="w-full max-w-lg bg-white rounded-t-2xl border-t border-x border-border"
        style={{ boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.15)' }}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%', scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground tracking-tight">New Audio Pin</h2>
            <p className="text-sm text-muted-light mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 -mr-1 text-muted hover:text-foreground rounded-full hover:bg-surface-hover flex items-center justify-center transition-all duration-200"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Title <span className="text-muted">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Give this place a name..."
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea"
              placeholder="What makes this place special?"
              rows={2}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((option) => {
                const isSelected = category === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCategory(option)}
                    className={`relative px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 ${
                      isSelected
                        ? 'text-white border-foreground'
                        : 'bg-surface-hover text-foreground border-border hover:border-border-strong'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="modal-category-pill"
                        className="absolute inset-0 bg-foreground rounded-full"
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      />
                    )}
                    <span className="relative z-10">{option}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Photo
            </label>
            <div className="space-y-3">
              {!photoUrl ? (
                <label className="flex items-center justify-center gap-2 px-5 py-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-border-strong transition-all duration-200">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-6 18l7.5-7.5m0 0a2.25 2.25 0 003.182-3.182l-7.5-7.5m-3.182 0L9.818 9.818a2.25 2.25 0 000 3.182z" />
                  </svg>
                  <span className="text-sm text-muted">Add a photo</span>
                </label>
              ) : (
                <div className="relative w-full h-48">
                  <Image
                    src={photoUrl!}
                    alt="Preview"
                    fill
                    className="object-cover rounded-xl border border-border"
                  />
                  <button
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-surface-hover transition-all duration-200"
                    aria-label="Remove photo"
                  >
                    <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Audio Recording */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Voice Note <span className="text-muted">*</span>
            </label>

            <div className="space-y-3">
              {/* Record Button */}
              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-white rounded-full
                             font-medium hover:bg-accent-hover transition-all duration-200"
                  >
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                    Record
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-200 recording-pulse"
                    style={{ background: '#404040', color: 'white' }}
                  >
                    <div className="w-2.5 h-2.5 bg-white rounded-sm" />
                    Stop
                  </button>
                )}

                {isRecording && (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-foreground" />
                      <div className="absolute inset-0 w-2 h-2 rounded-full animate-ping bg-foreground" />
                    </div>
                    <span className="font-medium">Recording{isTranscribing ? ' & transcribing' : ''}...</span>
                  </div>
                )}
              </div>

              {/* Waveform */}
              <div
                className={`w-full h-20 rounded-xl border overflow-hidden transition-all duration-200 ${
                  isRecording ? 'border-foreground' : 'border-border'
                } bg-surface-hover`}
                style={isRecording ? { boxShadow: '0 0 16px rgba(10, 10, 10, 0.12)' } : undefined}
              >
                <canvas ref={waveformCanvasRef} className="w-full h-full" aria-hidden="true" />
              </div>

              {/* Audio Preview */}
              {audioUrl && (
                <audio
                  controls
                  src={audioUrl}
                  className="w-full"
                  preload="metadata"
                />
              )}
            </div>
          </div>

          {/* Transcript */}
          {speechRecognitionAvailable ? (
            (transcript || isRecording) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium text-foreground">
                    Transcript
                  </label>
                  {isTranscribing && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-foreground text-white">
                      Live
                    </span>
                  )}
                </div>
                <div className="p-4 bg-surface-hover rounded-xl text-sm text-muted min-h-[48px] leading-relaxed">
                  {transcript || 'Listening...'}
                </div>
              </div>
            )
          ) : (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Transcript
              </label>
              <p className="text-xs text-muted mb-2">
                Live transcription unavailable in this browser. You can type your transcript below.
              </p>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="textarea"
                placeholder="Type your transcript here..."
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-hover/30">
          <button
            onClick={onClose}
            className="text-sm text-muted hover:text-foreground font-medium transition-all duration-200"
          >
            Cancel
          </button>
          <motion.button
            onClick={handleSave}
            disabled={!canSave}
            className={`btn-primary rounded-full ${!canSave ? 'opacity-50 cursor-not-allowed' : ''}`}
            whileTap={canSave ? { scale: 0.95 } : undefined}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : (
              'Save Pin'
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
    webkitAudioContext: typeof AudioContext;
  }
}
