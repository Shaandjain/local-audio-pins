import { Pin, PinCategory } from './pin';

export type JobStatus =
  | 'pending'
  | 'generating_content'
  | 'generating_audio'
  | 'completed'
  | 'failed'
  | 'partial';

export interface TourGenerationRequest {
  deviceId: string;
  center: { lat: number; lng: number };
  radiusMeters: number;
  pinCount: number;
  categories?: PinCategory[];
  idempotencyKey?: string;
}

export interface JobProgress {
  totalPins: number;
  completedPins: number;
  currentStep: string;
}

export interface JobError {
  code: string;
  message: string;
  retryable: boolean;
  failedPins?: string[];
}

export interface JobCosts {
  openaiTokens: number;
  elevenLabsCharacters: number;
  estimatedCostUsd: number;
}

export interface JobResult {
  tourId: string;
  pins: Pin[];
  estimatedDuration: number;  // seconds
  totalDistance: number;      // meters
}

export interface TourGenerationJob {
  id: string;
  deviceId: string;
  status: JobStatus;
  progress: JobProgress;
  request: TourGenerationRequest;
  result?: JobResult;
  error?: JobError;
  costs?: JobCosts;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedTour {
  id: string;
  deviceId: string;
  name: string;
  pins: Pin[];
  center: { lat: number; lng: number };
  generationJobId: string;
  estimatedDuration: number;
  totalDistance: number;
  createdAt: string;
}

// Error codes for tour generation
export const TourErrorCodes = {
  // Client errors
  INVALID_REQUEST: 'INVALID_REQUEST',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // Server errors
  OPENAI_ERROR: 'OPENAI_ERROR',
  ELEVEN_LABS_ERROR: 'ELEVEN_LABS_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  GENERATION_TIMEOUT: 'GENERATION_TIMEOUT',

  // Partial failures
  PARTIAL_CONTENT_FAILURE: 'PARTIAL_CONTENT_FAILURE',
  PARTIAL_AUDIO_FAILURE: 'PARTIAL_AUDIO_FAILURE',
} as const;

export type TourErrorCode = typeof TourErrorCodes[keyof typeof TourErrorCodes];
