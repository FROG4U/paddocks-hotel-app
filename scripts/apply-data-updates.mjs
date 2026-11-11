// One off data updates for the live site.
//
// Some things are not settings the hotel would want to type in by hand, like
// loading in every room from their own room list. Those go in
// scripts/data-updates as a small file each, and this runs any that have not
// run on this server yet. Each one runs once and only once: what has already
// been done is recorded alongside the live database, outside the git folder,
// so publishing an update never repeats it and never undoes anything the
// hotel has changed since.
//
// Runs as part of `npm run build`, after the schema has been brought up to
// date. If one of the updates fails it is reported and left unrecorded, so it
// is simply tried again next time rather than silently skipped.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const dataDir = process.env.PADDOCKS_DATA_DIR || path.resolve(root, "..", "paddocks-data");
const liveDb = path.join(dataDir, "paddocks.db");
const record = path.join(dataDir, "applied-updates.json");
const dir = path.join(root, "scripts", "data-updates");

if (!fs.existsSync(liveDb) || !fs.existsSync(dir)) process.exit(0);

let done = [];
try { done = JSON.parse(fs.readFileSync(record, "utf8")); } catch { /* none yet */ }

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mjs")).sort();
const pending = [];
for (const f of files) {
  const mod = await import(pathToFileURL(path.join(dir, f)).href);
  if (!done.includes(mod.name)) pending.push(mod);
}

if (!pending.length) process.exit(0);

process.env.DATABASE_URL = `file:${liveDb}`;
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({ datasources: { db: { url: `file:${liveDb}` } } });

for (const mod of pending) {
  console.log(`> Data update: ${mod.name}`);
  try {
    await mod.apply(prisma, (line) => console.log(line));
    done.push(mod.name);
    fs.writeFileSync(record, JSON.stringify(done, null, 2));
    console.log(`> Data update done: ${mod.name}`);
  } catch (e) {
    // Not recorded, so it will be tried again next time rather than skipped.
    console.error(`> Data update FAILED: ${mod.name}: ${e?.message || e}`);
  }
}

await prisma.$disconnect();
