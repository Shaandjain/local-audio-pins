import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/session';

// POST /api/pins/[id]/move - Move a pin to another collection
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

    if (pin.collectionId === targetCollectionId) {
      return NextResponse.json(
        { error: 'Pin is already in this collection' },
        { status: 400 }
      );
    }

    const updated = await prisma.pin.update({
      where: { id },
      data: { collectionId: targetCollectionId },
    });

    return NextResponse.json({
      id: updated.id,
      collectionId: updated.collectionId,
    });
  } catch (error) {
    console.error('Error moving pin:', error);
    return NextResponse.json({ error: 'Failed to move pin' }, { status: 500 });
  }
}
