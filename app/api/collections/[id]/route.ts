import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';

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
