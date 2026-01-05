import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const AUDIO_PATH = path.join(process.cwd(), 'data', 'audio');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const filePath = path.join(AUDIO_PATH, filename);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
    }

    const audioBuffer = readFileSync(filePath);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/webm',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error streaming audio:', error);
    return NextResponse.json({ error: 'Failed to stream audio' }, { status: 500 });
  }
}
