'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  transcript: string;
  audioFile: string;
  photoFile?: string;
  createdAt: string;
}

interface RecordingModalProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onSave: (pin: Pin) => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

export default function RecordingModal({ lat, lng, onClose, onSave }: RecordingModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef<string>('');

  const canSave = title.trim() && audioBlob && !isSaving;

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
    };
  }, [audioUrl, photoUrl]);

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      transcriptRef.current = '';
      setTranscript('');

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
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
      formData.append('audio', audioBlob, 'recording.webm');
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
      alert('Failed to save pin. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl border-t border-x border-border animate-slide-up"
        style={{ boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.15)' }}
        onClick={(e) => e.stopPropagation()}
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
          {(transcript || isRecording) && (
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
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`btn-primary rounded-full ${!canSave ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          </button>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
