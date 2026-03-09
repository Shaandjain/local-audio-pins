import sharp from 'sharp';

export interface ProcessedImage {
  fullBuffer: Buffer;
  thumbnailBuffer: Buffer;
  format: 'jpeg' | 'webp';
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
}

const FULL_MAX_DIMENSION = 1200;
const THUMB_MAX_DIMENSION = 400;
const FULL_QUALITY = 80;
const THUMB_QUALITY = 70;

export async function processImage(inputBuffer: Buffer): Promise<ProcessedImage> {
  const metadata = await sharp(inputBuffer).metadata();
  const isWebp = metadata.format === 'webp';
  const outputFormat = isWebp ? 'webp' : 'jpeg';

  // Process full-size image: auto-orient, resize, strip EXIF, compress
  const fullPipeline = sharp(inputBuffer)
    .rotate() // auto-orient based on EXIF
    .resize(FULL_MAX_DIMENSION, FULL_MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    });

  const fullImage = isWebp
    ? await fullPipeline.webp({ quality: FULL_QUALITY }).toBuffer({ resolveWithObject: true })
    : await fullPipeline.jpeg({ quality: FULL_QUALITY, mozjpeg: true }).toBuffer({ resolveWithObject: true });

  // Process thumbnail: same pipeline but smaller
  const thumbPipeline = sharp(inputBuffer)
    .rotate()
    .resize(THUMB_MAX_DIMENSION, THUMB_MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    });

  const thumbImage = isWebp
    ? await thumbPipeline.webp({ quality: THUMB_QUALITY }).toBuffer({ resolveWithObject: true })
    : await thumbPipeline.jpeg({ quality: THUMB_QUALITY, mozjpeg: true }).toBuffer({ resolveWithObject: true });

  return {
    fullBuffer: fullImage.data,
    thumbnailBuffer: thumbImage.data,
    format: outputFormat,
    width: fullImage.info.width,
    height: fullImage.info.height,
    thumbnailWidth: thumbImage.info.width,
    thumbnailHeight: thumbImage.info.height,
  };
}
