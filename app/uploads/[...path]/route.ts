import { NextRequest } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Serves images uploaded from /admin.
 *
 * Next.js builds its list of files in /public when the server starts, so a
 * photo uploaded afterwards is invisible to the static handler until the app
 * is restarted - it 404s, and the image optimizer rejects it with a 400.
 * Reading the file from disk on each request fixes that: an upload appears
 * on the site straight away.
 */
import { uploadDirs } from "@/lib/storage";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params;

  const type = TYPES[path.extname(segments[segments.length - 1] || "").toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });

  // Look in the live data folder first, then the older in-repo folder.
  for (const dir of uploadDirs()) {
    // Resolve inside the folder and refuse anything that escapes it.
    const target = path.resolve(dir, ...segments);
    if (!target.startsWith(dir + path.sep)) continue;

    try {
      const info = await stat(target);
      if (!info.isFile()) continue;
      const body = await readFile(target);
      return new Response(new Uint8Array(body), {
        headers: {
          "Content-Type": type,
          "Content-Length": String(info.size),
          // Filenames carry a timestamp, so a given URL never changes.
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch { /* try the next folder */ }
  }

  return new Response("Not found", { status: 404 });
}
