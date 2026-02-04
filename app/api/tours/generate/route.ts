import { NextRequest, NextResponse } from 'next/server';
import { TourGenerationRequest, TourErrorCodes } from '@/app/lib/types/tour';
import { PinCategory, PIN_CATEGORIES } from '@/app/lib/types/pin';
import { checkIdempotency, setIdempotency, getJob } from '@/app/lib/storage/jobs';
import { generateTour } from '@/app/lib/services/tourGenerator';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: Date }>();
const RATE_LIMIT = parseInt(process.env.TOUR_GENERATION_RATE_LIMIT || '5', 10);
const RATE_WINDOW_HOURS = 1;

function checkRateLimit(deviceId: string): { allowed: boolean; retryAfter?: number } {
  const now = new Date();
  const entry = rateLimitMap.get(deviceId);

  if (!entry || entry.resetAt < now) {
    const resetAt = new Date(now.getTime() + RATE_WINDOW_HOURS * 60 * 60 * 1000);
    rateLimitMap.set(deviceId, { count: 1, resetAt });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT) {
    const retryAfter = Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// POST /api/tours/generate - Start AI tour generation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { deviceId, center, radiusMeters, pinCount, categories, idempotencyKey } = body;

    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json(
        { error: 'deviceId is required', code: TourErrorCodes.INVALID_REQUEST },
        { status: 400 }
      );
    }

    if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number') {
      return NextResponse.json(
        { error: 'center with lat and lng is required', code: TourErrorCodes.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (center.lat < -90 || center.lat > 90 || center.lng < -180 || center.lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates', code: TourErrorCodes.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // Validate optional fields
    const validatedRadiusMeters = Math.min(Math.max(radiusMeters || 500, 100), 2000);
    const validatedPinCount = Math.min(Math.max(pinCount || 5, 1), 10);

    // Validate categories if provided
    let validatedCategories: PinCategory[] | undefined;
    if (categories && Array.isArray(categories)) {
      validatedCategories = categories.filter((c: string) =>
        PIN_CATEGORIES.includes(c as PinCategory)
      ) as PinCategory[];
    }

    // Check idempotency
    if (idempotencyKey) {
      const existingJobId = checkIdempotency(idempotencyKey);
      if (existingJobId) {
        const existingJob = getJob(existingJobId);
        return NextResponse.json(
          {
            error: 'Duplicate request',
            code: TourErrorCodes.DUPLICATE_REQUEST,
            existingJobId,
            status: existingJob?.status || 'unknown',
          },
          { status: 409 }
        );
      }
    }

    // Check rate limit
    const rateCheck = checkRateLimit(deviceId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: TourErrorCodes.RATE_LIMITED,
          retryAfter: rateCheck.retryAfter,
        },
        { status: 429 }
      );
    }

    // Build request
    const tourRequest: TourGenerationRequest = {
      deviceId,
      center,
      radiusMeters: validatedRadiusMeters,
      pinCount: validatedPinCount,
      categories: validatedCategories,
      idempotencyKey,
    };

    // Start generation (async)
    const jobId = await generateTour({ request: tourRequest });

    // Set idempotency
    if (idempotencyKey) {
      setIdempotency(idempotencyKey, jobId);
    }

    // Estimate completion time (~10 seconds per pin for content + audio)
    const estimatedCompletionSeconds = validatedPinCount * 10;

    return NextResponse.json(
      {
        jobId,
        status: 'pending',
        estimatedCompletionSeconds,
        pollUrl: `/api/tours/jobs/${jobId}`,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Error starting tour generation:', error);
    return NextResponse.json(
      { error: 'Failed to start tour generation', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
