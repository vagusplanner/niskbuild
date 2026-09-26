import 'server-only';

import convert from 'heic-convert';
import sharp from 'sharp';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type DetectedImageKind = 'jpeg' | 'png' | 'webp' | 'heic' | 'gif' | 'unknown';

/**
 * Sniff image type from magic bytes (more reliable than browser MIME on mobile).
 */
export function detectImageKind(buffer: Buffer): DetectedImageKind {
  if (buffer.length < 12) return 'unknown';

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }
  // GIF
  if (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a') {
    return 'gif';
  }
  // WebP (RIFF....WEBP)
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  // HEIC/HEIF (ftyp.... heic/heif/mif1/msf1)
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii');
    if (
      brand === 'heic' ||
      brand === 'heif' ||
      brand === 'mif1' ||
      brand === 'msf1' ||
      brand === 'heim' ||
      brand === 'heis'
    ) {
      return 'heic';
    }
    // Some HEIC variants put brand later in compatible brands — scan a short window
    const head = buffer.subarray(8, Math.min(buffer.length, 32)).toString('ascii');
    if (/heic|heif|mif1|msf1/i.test(head)) return 'heic';
  }

  return 'unknown';
}

export function extensionHint(filename: string | null | undefined): DetectedImageKind | null {
  if (!filename) return null;
  const lower = filename.toLowerCase();
  if (/\.(jpe?g)$/.test(lower)) return 'jpeg';
  if (/\.png$/.test(lower)) return 'png';
  if (/\.webp$/.test(lower)) return 'webp';
  if (/\.(heic|heif)$/.test(lower)) return 'heic';
  if (/\.gif$/.test(lower)) return 'gif';
  return null;
}

export type NormalizeHomeworkImageResult =
  | { ok: true; buffer: Buffer; contentType: 'image/jpeg' | 'image/png' | 'image/webp'; kind: DetectedImageKind }
  | { ok: false; error: string; code: 'UNSUPPORTED_TYPE' | 'TOO_LARGE' | 'CONVERT_FAILED' };

/**
 * Validate + convert homework photos for vision models.
 * HEIC/HEIF → JPEG. Empty browser MIME is OK if magic bytes / extension match.
 */
export async function normalizeHomeworkImage(input: {
  buffer: Buffer;
  reportedMime?: string | null;
  filename?: string | null;
}): Promise<NormalizeHomeworkImageResult> {
  if (input.buffer.length === 0) {
    return { ok: false, error: 'Empty image file', code: 'UNSUPPORTED_TYPE' };
  }
  if (input.buffer.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Image must be under 10MB', code: 'TOO_LARGE' };
  }

  const sniffed = detectImageKind(input.buffer);
  const fromExt = extensionHint(input.filename);
  const reported = (input.reportedMime || '').toLowerCase().trim();

  let kind: DetectedImageKind = sniffed;
  if (kind === 'unknown' && fromExt) kind = fromExt;
  if (kind === 'unknown') {
    if (reported.includes('jpeg') || reported.includes('jpg')) kind = 'jpeg';
    else if (reported.includes('png')) kind = 'png';
    else if (reported.includes('webp')) kind = 'webp';
    else if (reported.includes('heic') || reported.includes('heif')) kind = 'heic';
  }

  if (kind === 'unknown' || kind === 'gif') {
    return {
      ok: false,
      error:
        'Unsupported image format. Please upload a JPEG, PNG, WebP, or HEIC photo of your homework.',
      code: 'UNSUPPORTED_TYPE',
    };
  }

  if (kind === 'jpeg') {
    return { ok: true, buffer: input.buffer, contentType: 'image/jpeg', kind };
  }
  if (kind === 'png') {
    return { ok: true, buffer: input.buffer, contentType: 'image/png', kind };
  }
  if (kind === 'webp') {
    return { ok: true, buffer: input.buffer, contentType: 'image/webp', kind };
  }

  // HEIC/HEIF → JPEG for vision models.
  // Prebuilt sharp does not decode HEVC (patent); use heic-convert (libheif WASM).
  try {
    const converted = await convert({
      buffer: input.buffer,
      format: 'JPEG',
      quality: 0.9,
    });
    const jpegBuffer = Buffer.from(converted);
    // Normalize orientation / strip metadata via sharp when possible
    try {
      const rotated = await sharp(jpegBuffer).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer();
      return { ok: true, buffer: rotated, contentType: 'image/jpeg', kind: 'heic' };
    } catch {
      return { ok: true, buffer: jpegBuffer, contentType: 'image/jpeg', kind: 'heic' };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'HEIC conversion failed';
    console.error('[homework-image] HEIC convert failed:', message);
    return {
      ok: false,
      error:
        'Could not convert this iPhone HEIC photo. Try taking the photo again as JPEG, or export as JPG before uploading.',
      code: 'CONVERT_FAILED',
    };
  }
}
