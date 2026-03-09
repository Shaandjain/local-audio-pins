import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { processImage } from '../../../../lib/services/imageProcessor';
import { prisma } from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/session';
import { PinCategory } from '@/app/generated/prisma/client';

const DATA_PATH = path.join(process.cwd(), 'data', 'collections.json');
const AUDIO_PATH = path.join(process.cwd(), 'data', 'audio');
const PHOTOS_PATH = path.join(process.cwd(), 'data', 'photos');

interface Pin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  transcript: string;
  audioFile: string;
  photoFile?: string;
  thumbnailFile?: string;
  category?: string;
  createdAt: string;
}

interface Collection {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  pins: Pin[];
}

interface CollectionsData {
  collections: Collection[];
}

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'pin_';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const CATEGORY_MAP: Record<string, PinCategory> = {
  general: 'GENERAL',
  food: 'FOOD',
  history: 'HISTORY',
  nature: 'NATURE',
  culture: 'CULTURE',
  architecture: 'ARCHITECTURE',
};

function toPrismaCategory(category?: string | null): PinCategory {
  if (!category) return 'GENERAL';
  return CATEGORY_MAP[category.toLowerCase()] || 'GENERAL';
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
          pins: { orderBy: { createdAt: 'asc' } },
        },
      });

      if (collection) {
        return NextResponse.json(
          collection.pins.map((p) => ({
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
            isAiGenerated: p.isAiGenerated,
            aiGenerationId: p.aiGenerationId || undefined,
          }))
        );
      }
    }

    // Fallback to file-based storage
    const data: CollectionsData = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
    const collection = data.collections.find((c) => c.id === id);

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json(collection.pins);
  } catch (error) {
    console.error('Error reading pins:', error);
    return NextResponse.json({ error: 'Failed to read pins' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();

    const lat = parseFloat(formData.get('lat') as string);
    const lng = parseFloat(formData.get('lng') as string);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const transcript = formData.get('transcript') as string;
    const audio = formData.get('audio') as File;
    const photo = formData.get('photo') as File | null;
    const category = formData.get('category') as string | null;

    if (!audio || !lat || !lng) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate photo if provided
    if (photo) {
      if (!photo.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Photo must be an image file' }, { status: 400 });
      }
      if (photo.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Photo must be smaller than 10MB' }, { status: 400 });
      }
    }

    // Ensure directories exist
    if (!existsSync(AUDIO_PATH)) {
      mkdirSync(AUDIO_PATH, { recursive: true });
    }
    if (!existsSync(PHOTOS_PATH)) {
      mkdirSync(PHOTOS_PATH, { recursive: true });
    }

    // Generate pin ID and save audio file
    const pinId = generateId();
    const audioExt = path.extname(audio.name) || '.webm';
    const audioFileName = `${pinId}${audioExt}`;
    const audioFilePath = path.join(AUDIO_PATH, audioFileName);

    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    writeFileSync(audioFilePath, audioBuffer);

    // Process and save photo if provided
    let photoFileName: string | undefined;
    let thumbnailFileName: string | undefined;
    if (photo) {
      const photoBuffer = Buffer.from(await photo.arrayBuffer());
      const processed = await processImage(photoBuffer);
      const ext = processed.format === 'webp' ? '.webp' : '.jpg';

      photoFileName = `${pinId}${ext}`;
      thumbnailFileName = `${pinId}_thumb${ext}`;

      writeFileSync(path.join(PHOTOS_PATH, photoFileName), processed.fullBuffer);
      writeFileSync(path.join(PHOTOS_PATH, thumbnailFileName), processed.thumbnailBuffer);
    }

    // Try database first if user is authenticated
    const user = await getCurrentUser();
    if (user) {
      const collection = await prisma.collection.findFirst({
        where: { id, userId: user.id },
      });

      if (collection) {
        const dbPin = await prisma.pin.create({
          data: {
            title: title || '',
            description: description || '',
            transcript: transcript || '',
            lat,
            lng,
            audioUrl: audioFileName,
            photoUrl: photoFileName || null,
            thumbnailUrl: thumbnailFileName || null,
            category: toPrismaCategory(category),
            collectionId: collection.id,
            userId: user.id,
          },
        });

        return NextResponse.json(
          {
            id: dbPin.id,
            lat: dbPin.lat,
            lng: dbPin.lng,
            title: dbPin.title,
            description: dbPin.description || '',
            transcript: dbPin.transcript || '',
            audioFile: dbPin.audioUrl || '',
            photoFile: dbPin.photoUrl || undefined,
            thumbnailFile: dbPin.thumbnailUrl || undefined,
            category: dbPin.category,
            createdAt: dbPin.createdAt.toISOString(),
          },
          { status: 201 }
        );
      }
    }

    // Fallback to file-based storage
    const data: CollectionsData = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
    const collectionIndex = data.collections.findIndex((c) => c.id === id);

    if (collectionIndex === -1) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Create pin object
    const pin: Pin = {
      id: pinId,
      lat,
      lng,
      title: title || '',
      description: description || '',
      transcript: transcript || '',
      audioFile: audioFileName,
      photoFile: photoFileName,
      thumbnailFile: thumbnailFileName,
      category: category || undefined,
      createdAt: new Date().toISOString(),
    };

    // Add pin to collection
    data.collections[collectionIndex].pins.push(pin);

    // Save updated data
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

    return NextResponse.json(pin, { status: 201 });
  } catch (error) {
    console.error('Error creating pin:', error);
    return NextResponse.json({ error: 'Failed to create pin' }, { status: 500 });
  }
}
