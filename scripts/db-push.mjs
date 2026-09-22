// Applies schema changes to the live database.
//
// The live database sits outside the git checkout (see lib/storage.ts), so a
// plain `prisma db push` would only update the starter copy in the repo.
// This runs as part of `npm run build`, so the usual Plesk "run build" step
// keeps the live database in step with the code. `prisma db push` refuses
// any change that would lose data, so it can only ever add.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = process.env.PADDOCKS_DATA_DIR || path.resolve(root, "..", "paddocks-data");
const liveDb = path.join(dataDir, "paddocks.db");
const repoDb = path.join(root, "prisma", "prisma", "dev.db");

function push(file, label) {
  console.log(`> Updating ${label} database schema: ${file}`);
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: `file:${file}` },
  });
}

// Starter copy used for a brand new install.
if (fs.existsSync(repoDb)) push(repoDb, "starter");

// Live copy. Create it from the starter on a first ever run.
fs.mkdirSync(path.join(dataDir, "uploads"), { recursive: true });
if (!fs.existsSync(liveDb) && fs.existsSync(repoDb)) {
  fs.copyFileSync(repoDb, liveDb);
  console.log("> Created the live database from the starter copy");
}
if (fs.existsSync(liveDb)) push(liveDb, "live");
