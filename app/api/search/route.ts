import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';
import { prisma } from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/session';
import { haversineDistance } from '@/app/utils/geo';
import { PinCategory } from '@/app/generated/prisma/client';

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
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;
    const radius = searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : null;
    const sort = searchParams.get('sort') || 'newest';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Bounding box params for viewport-based loading
    const north = searchParams.get('north') ? parseFloat(searchParams.get('north')!) : null;
    const south = searchParams.get('south') ? parseFloat(searchParams.get('south')!) : null;
    const east = searchParams.get('east') ? parseFloat(searchParams.get('east')!) : null;
    const west = searchParams.get('west') ? parseFloat(searchParams.get('west')!) : null;
    const hasBounds = north !== null && south !== null && east !== null && west !== null;

    const user = await getCurrentUser();

    // Try Prisma first
    if (user) {
      try {
        const whereConditions: Record<string, unknown>[] = [];

        if (q) {
          whereConditions.push(
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { transcript: { contains: q, mode: 'insensitive' } },
          );
        }

        const categoryUpper = category?.toUpperCase() as PinCategory | undefined;
        const validCategory = categoryUpper && Object.values(PinCategory).includes(categoryUpper)
          ? categoryUpper
          : undefined;

        const pins = await prisma.pin.findMany({
          where: {
            ...(validCategory ? { category: validCategory } : {}),
            ...(hasBounds ? { lat: { gte: south!, lte: north! }, lng: { gte: west!, lte: east! } } : {}),
            collection: {
              OR: [{ userId: user.id }, { isPublic: true }],
            },
            ...(q ? { OR: whereConditions } : {}),
          },
          include: {
            collection: { select: { id: true, name: true } },
          },
          orderBy: sort === 'newest' ? { createdAt: 'desc' } : { createdAt: 'desc' },
          skip: offset,
          take: limit,
        });

        let results = pins.map((p) => {
          const distance =
            lat !== null && lng !== null
              ? Math.round(haversineDistance(lat, lng, p.lat, p.lng))
              : null;
          return {
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
            distance,
          };
        });

        // Filter by radius if specified
        if (lat !== null && lng !== null && radius !== null) {
          results = results.filter((r) => r.distance !== null && r.distance <= radius);
        }

        // Sort by nearest if requested
        if (sort === 'nearest' && lat !== null && lng !== null) {
          results.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        }

        return NextResponse.json({ pins: results, total: results.length });
      } catch {
        // Fall through to file-based
      }
    }

    // File-based fallback
    const data: CollectionsData = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
    const queryLower = q.toLowerCase();

    let allPins = data.collections.flatMap((col) =>
      col.pins.map((pin) => ({
        ...pin,
        collectionId: col.id,
        collectionName: col.name,
      }))
    );

    // Text search
    if (q) {
      allPins = allPins.filter(
        (pin) =>
          pin.title.toLowerCase().includes(queryLower) ||
          pin.description.toLowerCase().includes(queryLower) ||
          (pin.transcript || '').toLowerCase().includes(queryLower)
      );
    }

    // Category filter
    if (category) {
      const catLower = category.toLowerCase();
      allPins = allPins.filter(
        (pin) => (pin.category || 'general').toLowerCase() === catLower
      );
    }

    // Bounding box filter
    if (hasBounds) {
      allPins = allPins.filter(
        (pin) =>
          pin.lat >= south! && pin.lat <= north! &&
          pin.lng >= west! && pin.lng <= east!
      );
    }

    // Calculate distances
    let results = allPins.map((pin) => {
      const distance =
        lat !== null && lng !== null
          ? Math.round(haversineDistance(lat, lng, pin.lat, pin.lng))
          : null;
      return {
        id: pin.id,
        title: pin.title,
        description: pin.description,
        lat: pin.lat,
        lng: pin.lng,
        category: pin.category || 'GENERAL',
        thumbnailFile: pin.thumbnailFile,
        collectionId: pin.collectionId,
        collectionName: pin.collectionName,
        createdAt: pin.createdAt,
        distance,
      };
    });

    // Radius filter
    if (lat !== null && lng !== null && radius !== null) {
      results = results.filter((r) => r.distance !== null && r.distance <= radius);
    }

    // Sort
    if (sort === 'nearest' && lat !== null && lng !== null) {
      results.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    } else {
      results.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    const total = results.length;
    const paginated = results.slice(offset, offset + limit);

    return NextResponse.json({ pins: paginated, total });
  } catch (error) {
    console.error('Error searching pins:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
