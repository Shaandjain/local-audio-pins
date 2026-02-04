import { NextRequest, NextResponse } from 'next/server';
import { addFavorite, getPreferences } from '@/app/lib/storage/preferences';
import { recalculateCategoryWeights } from '@/app/lib/services/preferenceLearning';

// POST /api/preferences/[deviceId]/favorites - Add a favorite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const body = await request.json();
    const { pinId } = body;

    if (!pinId || typeof pinId !== 'string') {
      return NextResponse.json(
        { error: 'pinId is required' },
        { status: 400 }
      );
    }

    // Check if preferences exist
    const existingPrefs = getPreferences(deviceId);
    if (!existingPrefs) {
      return NextResponse.json(
        { error: 'Preferences not found. Create preferences first.' },
        { status: 404 }
      );
    }

    // Add favorite
    const preferences = addFavorite(deviceId, pinId);

    // Recalculate category weights based on favorites
    const updatedPreferences = await recalculateCategoryWeights(preferences);

    return NextResponse.json({
      success: true,
      favoritePinIds: updatedPreferences.favoritePinIds,
      updatedCategoryWeights: updatedPreferences.categoryWeights,
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

// GET /api/preferences/[deviceId]/favorites - List favorites
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;

    const preferences = getPreferences(deviceId);

    if (!preferences) {
      return NextResponse.json(
        { error: 'Preferences not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      favoritePinIds: preferences.favoritePinIds,
      count: preferences.favoritePinIds.length,
    });
  } catch (error) {
    console.error('Error getting favorites:', error);
    return NextResponse.json(
      { error: 'Failed to get favorites' },
      { status: 500 }
    );
  }
}
