import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import path from 'path';
import { TourGenerationJob, JobStatus, JobProgress, JobError, JobResult, JobCosts, TourGenerationRequest } from '../types/tour';

const JOBS_DIR = path.join(process.cwd(), 'data', 'jobs');

function ensureJobsDir(): void {
  if (!existsSync(JOBS_DIR)) {
    mkdirSync(JOBS_DIR, { recursive: true });
  }
}

function getJobPath(jobId: string): string {
  return path.join(JOBS_DIR, `${jobId}.json`);
}

function generateJobId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'job_';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createJob(request: TourGenerationRequest): TourGenerationJob {
  ensureJobsDir();

  const now = new Date().toISOString();
  const job: TourGenerationJob = {
    id: generateJobId(),
    deviceId: request.deviceId,
    status: 'pending',
    progress: {
      totalPins: request.pinCount,
      completedPins: 0,
      currentStep: 'Initializing',
    },
    request,
    createdAt: now,
    updatedAt: now,
  };

  saveJob(job);
  return job;
}

export function getJob(jobId: string): TourGenerationJob | null {
  const filePath = getJobPath(jobId);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as TourGenerationJob;
  } catch (error) {
    console.error(`Error reading job ${jobId}:`, error);
    return null;
  }
}

export function saveJob(job: TourGenerationJob): void {
  ensureJobsDir();
  const filePath = getJobPath(job.id);
  job.updatedAt = new Date().toISOString();
  writeFileSync(filePath, JSON.stringify(job, null, 2));
}

export function updateJobStatus(jobId: string, status: JobStatus): TourGenerationJob | null {
  const job = getJob(jobId);
  if (!job) return null;

  job.status = status;
  saveJob(job);
  return job;
}

export function updateJobProgress(
  jobId: string,
  progress: Partial<JobProgress>
): TourGenerationJob | null {
  const job = getJob(jobId);
  if (!job) return null;

  job.progress = { ...job.progress, ...progress };
  saveJob(job);
  return job;
}

export function completeJob(
  jobId: string,
  result: JobResult,
  costs?: JobCosts
): TourGenerationJob | null {
  const job = getJob(jobId);
  if (!job) return null;

  job.status = 'completed';
  job.result = result;
  job.costs = costs;
  job.progress.completedPins = job.progress.totalPins;
  job.progress.currentStep = 'Complete';
  saveJob(job);
  return job;
}

export function failJob(jobId: string, error: JobError): TourGenerationJob | null {
  const job = getJob(jobId);
  if (!job) return null;

  job.status = 'failed';
  job.error = error;
  job.progress.currentStep = 'Failed';
  saveJob(job);
  return job;
}

export function partialCompleteJob(
  jobId: string,
  result: JobResult,
  error: JobError,
  costs?: JobCosts
): TourGenerationJob | null {
  const job = getJob(jobId);
  if (!job) return null;

  job.status = 'partial';
  job.result = result;
  job.error = error;
  job.costs = costs;
  saveJob(job);
  return job;
}

export function getJobsByDevice(deviceId: string): TourGenerationJob[] {
  ensureJobsDir();

  const files = readdirSync(JOBS_DIR).filter((f) => f.endsWith('.json'));
  const jobs: TourGenerationJob[] = [];

  for (const file of files) {
    const job = getJob(file.replace('.json', ''));
    if (job && job.deviceId === deviceId) {
      jobs.push(job);
    }
  }

  return jobs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Idempotency support
const idempotencyCache = new Map<string, { jobId: string; expiresAt: Date }>();

export function checkIdempotency(key: string): string | null {
  const entry = idempotencyCache.get(key);
  if (!entry) return null;

  if (entry.expiresAt < new Date()) {
    idempotencyCache.delete(key);
    return null;
  }

  return entry.jobId;
}

export function setIdempotency(key: string, jobId: string): void {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour TTL
  idempotencyCache.set(key, { jobId, expiresAt });
}
