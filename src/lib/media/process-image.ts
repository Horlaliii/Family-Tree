'use client';

// Browser-side image preparation, so relatives on mobile data upload small
// files: HEIC → JPEG, resize to at most 2000px, and a small WebP thumbnail.

export const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];
export const ACCEPT_ATTRIBUTE = `${ACCEPTED_TYPES.join(',')},.heic,.heif`;
export const MAX_PDF_BYTES = 25 * 1024 * 1024;

const FULL_MAX = 2000;
const THUMB_MAX = 480;

export function isHeic(file: File) {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

export function isPdf(file: File) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export function isSupported(file: File) {
  return ACCEPTED_TYPES.includes(file.type) || isHeic(file) || isPdf(file);
}

function scaled(width: number, height: number, max: number) {
  const ratio = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

async function render(bitmap: ImageBitmap, max: number, type: string, quality: number) {
  const size = scaled(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser cannot process images.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error('Could not compress the image.');
  return { blob, ...size };
}

export interface ProcessedImage {
  original: Blob;
  thumb: Blob;
  width: number;
  height: number;
  mimeType: 'image/jpeg';
}

export async function processImage(file: File): Promise<ProcessedImage> {
  let source: Blob = file;
  if (isHeic(file)) {
    const { default: heic2any } = await import('heic2any');
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    source = Array.isArray(converted) ? converted[0]! : converted;
  }
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  try {
    const full = await render(bitmap, FULL_MAX, 'image/jpeg', 0.85);
    const thumb = await render(bitmap, THUMB_MAX, 'image/webp', 0.8);
    return {
      original: full.blob,
      thumb: thumb.blob,
      width: full.width,
      height: full.height,
      mimeType: 'image/jpeg',
    };
  } finally {
    bitmap.close();
  }
}
