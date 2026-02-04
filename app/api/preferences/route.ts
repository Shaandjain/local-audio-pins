import { NextRequest, NextResponse } from 'next/server';
import { getOrCreatePreferences, savePreferences } from '@/app/lib/storage/preferences';

// POST /api/preferences - Create or get preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId } = body;

    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json(
        { error: 'deviceId is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate UUID format (basic check)
    if (deviceId.length < 8 || deviceId.length > 64) {
      return NextResponse.json(
        { error: 'deviceId must be between 8 and 64 characters' },
        { status: 400 }
      );
    }

    const preferences = getOrCreatePreferences(deviceId);

    return NextResponse.json({
      deviceId: preferences.deviceId,
      categoryWeights: preferences.categoryWeights,
      favoriteCount: preferences.favoritePinIds.length,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
    });
  } catch (error) {
    console.error('Error creating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to create preferences' },
      { status: 500 }
    );
  }
}
