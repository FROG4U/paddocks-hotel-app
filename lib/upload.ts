import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Compress an uploaded image with sharp and save it under /public/uploads.
// Returns the public path (e.g. "/uploads/king-room-172...jpg") or null if no file.
export async function saveUploadedImage(file: File | null, baseName: string): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  await mkdir(UPLOAD_DIR, { recursive: true });

  const buf = Buffer.from(await file.arrayBuffer());
  const safe = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "image";
  const filename = `${safe}-${Date.now()}.jpg`;

  const out = await sharp(buf)
    .rotate()
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  await writeFile(path.join(UPLOAD_DIR, filename), out);
  return `/uploads/${filename}`;
}
