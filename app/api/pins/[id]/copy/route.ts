import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/session';

// POST /api/pins/[id]/copy - Copy a pin to another collection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetCollectionId } = await request.json();

    if (!targetCollectionId) {
      return NextResponse.json(
        { error: 'targetCollectionId is required' },
        { status: 400 }
      );
    }

    // Verify the pin belongs to the user
    const pin = await prisma.pin.findFirst({
      where: { id, userId: user.id },
    });

    if (!pin) {
      return NextResponse.json({ error: 'Pin not found' }, { status: 404 });
    }

    // Verify the target collection belongs to the user
    const targetCollection = await prisma.collection.findFirst({
      where: { id: targetCollectionId, userId: user.id },
    });

    if (!targetCollection) {
      return NextResponse.json(
        { error: 'Target collection not found' },
        { status: 404 }
      );
    }

    // Create a copy of the pin in the target collection
    // Audio and photo files are shared (referenced, not duplicated)
    const copy = await prisma.pin.create({
      data: {
        title: pin.title,
        description: pin.description,
        transcript: pin.transcript,
        lat: pin.lat,
        lng: pin.lng,
        audioUrl: pin.audioUrl,
        photoUrl: pin.photoUrl,
        thumbnailUrl: pin.thumbnailUrl,
        category: pin.category,
        duration: pin.duration,
        isAiGenerated: pin.isAiGenerated,
        aiGenerationId: pin.aiGenerationId,
        collectionId: targetCollectionId,
        userId: user.id,
      },
    });

    return NextResponse.json(
      {
        id: copy.id,
        collectionId: copy.collectionId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error copying pin:', error);
    return NextResponse.json({ error: 'Failed to copy pin' }, { status: 500 });
  }
}
