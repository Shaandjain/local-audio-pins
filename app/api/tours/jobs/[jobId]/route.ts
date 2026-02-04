import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/app/lib/storage/jobs';

// GET /api/tours/jobs/[jobId] - Get job status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const job = getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Calculate estimated remaining time
    let estimatedRemainingSeconds: number | undefined;
    if (job.status === 'pending' || job.status === 'generating_content' || job.status === 'generating_audio') {
      const remainingPins = job.progress.totalPins - job.progress.completedPins;
      estimatedRemainingSeconds = remainingPins * 10; // ~10 seconds per pin
    }

    // Build response based on status
    const response: Record<string, unknown> = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
    };

    if (estimatedRemainingSeconds !== undefined) {
      response.estimatedRemainingSeconds = estimatedRemainingSeconds;
    }

    if (job.status === 'completed' || job.status === 'partial') {
      response.result = job.result;
      response.costs = job.costs;
    }

    if (job.status === 'failed' || job.status === 'partial') {
      response.error = job.error;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}
