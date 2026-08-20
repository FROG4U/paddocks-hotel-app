import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Photos are never displayed wider than the page, so there is no point
// storing anything bigger. 1800px covers a full-width banner on a large
// screen with room to spare.
const MAX_EDGE = 1800;

// Aim for files small enough to load quickly on a phone. If the first pass
// comes out larger we step the quality down and try again, so a big camera
// photo ends up small without a visible drop in quality.
const TARGET_BYTES = 320 * 1024;
const QUALITY_STEPS = [82, 76, 70, 62];

/** Thrown when a file cannot be read as an image, so callers can show the message. */
export class UploadError extends Error {}

const FRIENDLY = "That file could not be read as an image. iPhone photos saved as HEIC are not supported - in Settings, Camera, Formats choose \"Most Compatible\", or export the photo as JPEG first. JPEG, PNG, WebP, AVIF, GIF and TIFF all work.";

/**
 * Compress an uploaded image with sharp and save it under /public/uploads.
 * Images with transparency (logos, icons) are kept as WebP so they do not
 * pick up a black background; everything else becomes a progressive JPEG.
 * Returns the public path, or null if no file was uploaded.
 */
export async function saveUploadedImage(file: File | null, baseName: string): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  await mkdir(UPLOAD_DIR, { recursive: true });

  const buf = Buffer.from(await file.arrayBuffer());
  const safe = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "image";

  let meta;
  try {
    meta = await sharp(buf).metadata();
  } catch {
    throw new UploadError(FRIENDLY);
  }
  const hasAlpha = !!meta.hasAlpha;

  // .rotate() applies the EXIF orientation so phone photos are the right way up.
  const base = sharp(buf)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });

  let out: Buffer | null = null;
  try {
    for (const quality of QUALITY_STEPS) {
      out = hasAlpha
        ? await base.clone().webp({ quality, effort: 5 }).toBuffer()
        : await base.clone().jpeg({ quality, mozjpeg: true, progressive: true }).toBuffer();
      if (out.length <= TARGET_BYTES) break;
    }
  } catch {
    throw new UploadError(FRIENDLY);
  }
  if (!out) throw new UploadError(FRIENDLY);

  const ext = hasAlpha ? "webp" : "jpg";
  const filename = `${safe}-${Date.now()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), out);
  return `/uploads/${filename}`;
}
