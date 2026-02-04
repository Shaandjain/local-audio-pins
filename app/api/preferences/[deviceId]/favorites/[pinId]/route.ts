import { NextRequest, NextResponse } from 'next/server';
import { removeFavorite, getPreferences } from '@/app/lib/storage/preferences';
import { recalculateCategoryWeights } from '@/app/lib/services/preferenceLearning';

// DELETE /api/preferences/[deviceId]/favorites/[pinId] - Remove a favorite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string; pinId: string }> }
) {
  try {
    const { deviceId, pinId } = await params;

    // Check if preferences exist
    const existingPrefs = getPreferences(deviceId);
    if (!existingPrefs) {
      return NextResponse.json(
        { error: 'Preferences not found' },
        { status: 404 }
      );
    }

    // Check if pin is in favorites
    if (!existingPrefs.favoritePinIds.includes(pinId)) {
      return NextResponse.json(
        { error: 'Pin not in favorites' },
        { status: 404 }
      );
    }

    // Remove favorite
    const preferences = removeFavorite(deviceId, pinId);

    // Recalculate category weights
    const updatedPreferences = await recalculateCategoryWeights(preferences);

    return NextResponse.json({
      success: true,
      favoritePinIds: updatedPreferences.favoritePinIds,
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
