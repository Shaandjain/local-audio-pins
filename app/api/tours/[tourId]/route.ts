import { NextRequest, NextResponse } from 'next/server';
import { getTour, deleteTour } from '@/app/lib/storage/tours';

// GET /api/tours/[tourId] - Get a generated tour
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  try {
    const { tourId } = await params;

    const tour = getTour(tourId);

    if (!tour) {
      return NextResponse.json(
        { error: 'Tour not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: tour.id,
      name: tour.name,
      pins: tour.pins,
      center: tour.center,
      estimatedDuration: tour.estimatedDuration,
      totalDistance: tour.totalDistance,
      generatedAt: tour.createdAt,
    });
  } catch (error) {
    console.error('Error getting tour:', error);
    return NextResponse.json(
      { error: 'Failed to get tour' },
      { status: 500 }
    );
  }
}

// DELETE /api/tours/[tourId] - Delete a generated tour
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  try {
    const { tourId } = await params;

    const deleted = deleteTour(tourId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Tour not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tour:', error);
    return NextResponse.json(
      { error: 'Failed to delete tour' },
      { status: 500 }
    );
  }
}
