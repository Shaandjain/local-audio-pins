import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Read current data
    const data: CollectionsData = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
    const collectionIndex = data.collections.findIndex((c) => c.id === id);

    if (collectionIndex === -1) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
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
    const audioFileName = `${pinId}.webm`;
    const audioFilePath = path.join(AUDIO_PATH, audioFileName);

    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    writeFileSync(audioFilePath, audioBuffer);

    // Save photo if provided
    let photoFileName: string | undefined;
    if (photo) {
      const ext = path.extname(photo.name) || '.jpg';
      photoFileName = `${pinId}${ext}`;
      const photoFilePath = path.join(PHOTOS_PATH, photoFileName);
      const photoBuffer = Buffer.from(await photo.arrayBuffer());
      writeFileSync(photoFilePath, photoBuffer);
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
