import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const PHOTOS_PATH = path.join(process.cwd(), 'data', 'photos');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const filePath = path.join(PHOTOS_PATH, filename);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Photo file not found' }, { status: 404 });
    }

    const imageBuffer = readFileSync(filePath);
    
    // Determine content type from file extension
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 
                        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                        ext === '.gif' ? 'image/gif' : 
                        ext === '.webp' ? 'image/webp' : 
                        'image/jpeg';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error streaming photo:', error);
    return NextResponse.json({ error: 'Failed to stream photo' }, { status: 500 });
  }
}
