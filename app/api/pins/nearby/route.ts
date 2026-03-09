import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';
import { prisma } from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/session';
import { haversineDistance } from '@/app/utils/geo';

const DATA_PATH = path.join(process.cwd(), 'data', 'collections.json');

interface FilePin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  transcript?: string;
  audioFile: string;
  photoFile?: string;
  thumbnailFile?: string;
  category?: string;
  createdAt: string;
}

interface FileCollection {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  pins: FilePin[];
}

interface CollectionsData {
  collections: FileCollection[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const radius = parseFloat(searchParams.get('radius') || '5000');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'lat and lng are required' },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();

    // Try Prisma first
    if (user) {
      try {
        // Rough bounding box pre-filter (1 degree ~ 111km)
        const degreeOffset = radius / 111000;
        const pins = await prisma.pin.findMany({
          where: {
            lat: { gte: lat - degreeOffset, lte: lat + degreeOffset },
            lng: { gte: lng - degreeOffset, lte: lng + degreeOffset },
            collection: {
              OR: [{ userId: user.id }, { isPublic: true }],
            },
          },
          include: {
            collection: { select: { id: true, name: true } },
          },
        });

        const results = pins
          .map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description || '',
            lat: p.lat,
            lng: p.lng,
            category: p.category,
            thumbnailFile: p.thumbnailUrl || undefined,
            duration: p.duration,
            collectionId: p.collection.id,
            collectionName: p.collection.name,
            createdAt: p.createdAt.toISOString(),
            distance: Math.round(haversineDistance(lat, lng, p.lat, p.lng)),
          }))
          .filter((r) => r.distance <= radius)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, limit);

        return NextResponse.json({ pins: results });
      } catch {
        // Fall through to file-based
      }
    }

    // File-based fallback
    const data: CollectionsData = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));

    const allPins = data.collections.flatMap((col) =>
      col.pins.map((pin) => ({
        id: pin.id,
        title: pin.title,
        description: pin.description,
        lat: pin.lat,
        lng: pin.lng,
        category: pin.category || 'GENERAL',
        thumbnailFile: pin.thumbnailFile,
        collectionId: col.id,
        collectionName: col.name,
        createdAt: pin.createdAt,
        distance: Math.round(haversineDistance(lat, lng, pin.lat, pin.lng)),
      }))
    );

    const results = allPins
      .filter((r) => r.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return NextResponse.json({ pins: results });
  } catch (error) {
    console.error('Error fetching nearby pins:', error);
    return NextResponse.json({ error: 'Failed to fetch nearby pins' }, { status: 500 });
  }
}
