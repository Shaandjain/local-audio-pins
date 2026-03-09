import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/session';

// GET /api/collections - List the current user's collections
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collections = await prisma.collection.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { pins: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      collections: collections.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        isPublic: c.isPublic,
        center: { lat: c.centerLat, lng: c.centerLng },
        pinCount: c._count.pins,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error listing collections:', error);
    return NextResponse.json(
      { error: 'Failed to list collections' },
      { status: 500 }
    );
  }
}

// POST /api/collections - Create a new collection
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, center, isPublic } = await request.json();

    if (!name || !center?.lat || !center?.lng) {
      return NextResponse.json(
        { error: 'name and center (lat/lng) are required' },
        { status: 400 }
      );
    }

    const collection = await prisma.collection.create({
      data: {
        name,
        description: description || null,
        userId: user.id,
        isPublic: isPublic ?? false,
        centerLat: center.lat,
        centerLng: center.lng,
      },
    });

    return NextResponse.json(
      {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        isPublic: collection.isPublic,
        center: { lat: collection.centerLat, lng: collection.centerLng },
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}
