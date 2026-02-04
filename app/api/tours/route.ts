import { NextRequest, NextResponse } from 'next/server';
import { getToursByDevice } from '@/app/lib/storage/tours';

// GET /api/tours?deviceId={deviceId} - List tours for a device
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId query parameter is required' },
        { status: 400 }
      );
    }

    const tours = getToursByDevice(deviceId);

    return NextResponse.json({
      tours: tours.map((tour) => ({
        id: tour.id,
        name: tour.name,
        pinCount: tour.pins.length,
        center: tour.center,
        estimatedDuration: tour.estimatedDuration,
        totalDistance: tour.totalDistance,
        generatedAt: tour.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error listing tours:', error);
    return NextResponse.json(
      { error: 'Failed to list tours' },
      { status: 500 }
    );
  }
}
