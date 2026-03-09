import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';
import { prisma } from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/session';

const DATA_PATH = path.join(process.cwd(), 'data', 'collections.json');

interface Collection {
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
    category?: string;
    createdAt: string;
  }>;
}

interface CollectionsData {
  collections: Collection[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    // Try database first if user is authenticated
    if (user) {
      const collection = await prisma.collection.findFirst({
        where: {
          id,
          OR: [{ userId: user.id }, { isPublic: true }],
        },
        include: {
          pins: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (collection) {
        return NextResponse.json({
          id: collection.id,
          name: collection.name,
          isPublic: collection.isPublic,
          center: { lat: collection.centerLat, lng: collection.centerLng },
          pins: collection.pins.map((p) => ({
            id: p.id,
            lat: p.lat,
            lng: p.lng,
            title: p.title,
            description: p.description || '',
            transcript: p.transcript || '',
            audioFile: p.audioUrl || '',
            photoFile: p.photoUrl || undefined,
            category: p.category,
            createdAt: p.createdAt.toISOString(),
            isAiGenerated: p.isAiGenerated,
            aiGenerationId: p.aiGenerationId || undefined,
          })),
        });
      }
    }

    // Fallback to file-based storage for backwards compatibility
    const data: CollectionsData = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
    const collection = data.collections.find((c) => c.id === id);

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json(collection);
  } catch (error) {
    console.error('Error reading collection:', error);
    return NextResponse.json({ error: 'Failed to read collection' }, { status: 500 });
  }
}

// PATCH /api/collections/[id] - Update collection name/description
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isPublic } = body;

    const collection = await prisma.collection.findFirst({
      where: { id, userId: user.id },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isPublic: updated.isPublic,
      center: { lat: updated.centerLat, lng: updated.centerLng },
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Error updating collection:', error);
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 });
  }
}

// DELETE /api/collections/[id] - Delete a collection and all its pins
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collection = await prisma.collection.findFirst({
      where: { id, userId: user.id },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check if this is the user's only collection (default collection protection)
    const collectionCount = await prisma.collection.count({
      where: { userId: user.id },
    });

    if (collectionCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete your only collection' },
        { status: 400 }
      );
    }

    // Cascade delete handles pins, tours, etc.
    await prisma.collection.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting collection:', error);
    return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 });
  }
}
