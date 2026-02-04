import { NextRequest, NextResponse } from 'next/server';
import { getPinsInRadius } from '@/app/lib/storage/tours';

// Thresholds for recommendations
const PIN_DENSITY_THRESHOLDS = {
  SUFFICIENT: 5,  // 5+ pins in area = sufficient
  ENRICH: 2,      // 2-4 pins = could use more
  GENERATE: 1,    // 0-1 pins = recommend generation
};

// GET /api/areas/analyze - Check if an area needs AI tour generation
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const radiusMeters = parseInt(searchParams.get('radiusMeters') || '500', 10);
    const collectionId = searchParams.get('collectionId') || 'default';

    // Validate required parameters
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'lat and lng query parameters are required and must be numbers' },
        { status: 400 }
      );
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Validate radius
    const validatedRadius = Math.min(Math.max(radiusMeters, 100), 2000);

    // Get existing pins in the area
    const existingPins = getPinsInRadius(collectionId, { lat, lng }, validatedRadius);

    // Determine recommendation
    let recommendation: 'generate' | 'enrich' | 'sufficient';
    let suggestedPinCount: number;

    if (existingPins.length <= PIN_DENSITY_THRESHOLDS.GENERATE) {
      recommendation = 'generate';
      suggestedPinCount = 5; // Generate a full tour
    } else if (existingPins.length < PIN_DENSITY_THRESHOLDS.SUFFICIENT) {
      recommendation = 'enrich';
      suggestedPinCount = PIN_DENSITY_THRESHOLDS.SUFFICIENT - existingPins.length;
    } else {
      recommendation = 'sufficient';
      suggestedPinCount = 0;
    }

    // Analyze category distribution of existing pins
    const categoryDistribution: Record<string, number> = {};
    for (const pin of existingPins) {
      const category = pin.category || 'General';
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    }

    // Identify underrepresented categories
    const allCategories = ['General', 'Food', 'History', 'Nature', 'Culture', 'Architecture'];
    const missingCategories = allCategories.filter(
      (cat) => !categoryDistribution[cat] || categoryDistribution[cat] === 0
    );

    return NextResponse.json({
      center: { lat, lng },
      radiusMeters: validatedRadius,
      existingPins: {
        count: existingPins.length,
        pins: existingPins.map((p) => ({
          id: p.id,
          title: p.title,
          category: p.category,
          lat: p.lat,
          lng: p.lng,
          isAiGenerated: p.isAiGenerated || false,
        })),
      },
      recommendation,
      suggestedPinCount,
      categoryAnalysis: {
        distribution: categoryDistribution,
        missingCategories,
      },
    });
  } catch (error) {
    console.error('Error analyzing area:', error);
    return NextResponse.json(
      { error: 'Failed to analyze area' },
      { status: 500 }
    );
  }
}
