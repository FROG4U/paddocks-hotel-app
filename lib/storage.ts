import "server-only";
import fs from "fs";
import path from "path";

/**
 * Where the live data lives.
 *
 * The database file and the photo uploads must sit OUTSIDE the git
 * checkout. When they lived inside it, every deployment overwrote the live
 * database with the copy from the repository, which wiped anything that had
 * been added or edited through the admin panel since the last commit.
 *
 * On first run this copies the repository's starter database into the data
 * folder. After that the repository copy is never read or written again, so
 * deployments cannot touch live content.
 */

// A sibling of the application folder, so a git checkout never sees it.
const DATA_DIR = process.env.PADDOCKS_DATA_DIR
  || path.resolve(process.cwd(), "..", "paddocks-data");

export const LIVE_DB = path.join(DATA_DIR, "paddocks.db");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

// Where the starter copies live inside the repository.
const REPO_DB = path.join(process.cwd(), "prisma", "prisma", "dev.db");
export const LEGACY_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

let ready = false;

/**
 * Make sure the data folder exists and holds a database. Runs once per
 * process, before the Prisma client is created.
 */
export function ensureDataDir() {
  if (ready) return DATA_DIR;
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    // First run on a server: take the database that shipped with the code.
    if (!fs.existsSync(LIVE_DB) && fs.existsSync(REPO_DB)) {
      fs.copyFileSync(REPO_DB, LIVE_DB);
    }

    // Bring across any photos that were uploaded before this change, so
    // nothing that is already on the site disappears.
    if (fs.existsSync(LEGACY_UPLOAD_DIR)) {
      for (const name of fs.readdirSync(LEGACY_UPLOAD_DIR)) {
        const from = path.join(LEGACY_UPLOAD_DIR, name);
        const to = path.join(UPLOAD_DIR, name);
        try {
          if (!fs.existsSync(to) && fs.statSync(from).isFile()) fs.copyFileSync(from, to);
        } catch { /* skip anything unreadable */ }
      }
    }
    ready = true;
  } catch {
    // If the folder cannot be created (permissions, read-only disk) fall
    // back to the old in-repo behaviour rather than failing to start.
    ready = true;
  }
  return DATA_DIR;
}

/** The database URL Prisma should use, with the data folder prepared. */
export function resolveDatabaseUrl() {
  ensureDataDir();
  if (fs.existsSync(LIVE_DB)) return `file:${LIVE_DB}`;
  return process.env.DATABASE_URL || `file:${REPO_DB}`;
}

/** Both places an uploaded file might be, newest location first. */
export function uploadDirs() {
  ensureDataDir();
  return [UPLOAD_DIR, LEGACY_UPLOAD_DIR];
}
