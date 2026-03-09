import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';
import { prisma } from '@/app/lib/db';

const DATA_PATH = path.join(process.cwd(), 'data', 'collections.json');

interface FileCollection {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  pins: Array<{
    id: string;
    lat: number;
    lng: number;
    title: string;
    description: string;
    audioFile: string;
    photoFile?: string;
    thumbnailFile?: string;
    category?: string;
    createdAt: string;
  }>;
}

interface CollectionsData {
  collections: FileCollection[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try database first
    const collection = await prisma.collection.findFirst({
      where: {
        id,
        isPublic: true,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        pins: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { pins: true },
        },
      },
    });

    if (collection) {
      return NextResponse.json({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        isPublic: true,
        center: { lat: collection.centerLat, lng: collection.centerLng },
        pinCount: collection._count.pins,
        creator: {
          id: collection.user.id,
          name: collection.user.name,
          image: collection.user.image,
        },
        pins: collection.pins.map((p) => ({
          id: p.id,
          lat: p.lat,
          lng: p.lng,
          title: p.title,
          description: p.description || '',
          transcript: p.transcript || '',
          audioFile: p.audioUrl || '',
          photoFile: p.photoUrl || undefined,
          thumbnailFile: p.thumbnailUrl || undefined,
          category: p.category,
          createdAt: p.createdAt.toISOString(),
        })),
      });
    }

    // Check if collection exists but is private
    const privateCollection = await prisma.collection.findUnique({
      where: { id },
    });

    if (privateCollection) {
      return NextResponse.json(
        { error: 'This collection is private', isPrivate: true },
        { status: 403 }
      );
    }

    // Fallback to file-based storage
    try {
      const data: CollectionsData = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
      const fileCollection = data.collections.find((c) => c.id === id);

      if (fileCollection) {
        return NextResponse.json({
          id: fileCollection.id,
          name: fileCollection.name,
          description: null,
          isPublic: true,
          center: fileCollection.center,
          pinCount: fileCollection.pins.length,
          creator: null,
          pins: fileCollection.pins,
        });
      }
    } catch {
      // File doesn't exist or is invalid - ignore
    }

    return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  } catch (error) {
    console.error('Error reading public collection:', error);
    return NextResponse.json({ error: 'Failed to read collection' }, { status: 500 });
  }
}
