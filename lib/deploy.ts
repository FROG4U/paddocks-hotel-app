import "server-only";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { ensureDataDir } from "./storage";

const run = promisify(exec);

/**
 * Updating the website without going through Plesk.
 *
 * Fetches the latest code from GitHub, installs anything new, builds, and
 * restarts the app. The order matters: the app is only restarted when the
 * build has actually succeeded, so a broken build can never take the live
 * site down. The old version keeps serving until a good one is ready.
 *
 * Live content is not at risk. The database and uploaded photos live
 * outside the git folder (see lib/storage.ts), so resetting the code
 * cannot touch them.
 */

const ROOT = process.cwd();
const LOG = () => path.join(ensureDataDir(), "deploy.log");
const LOCK = () => path.join(ensureDataDir(), "deploy.lock");

// A build can take a couple of minutes; anything beyond this has hung.
const STEP_TIMEOUT = 8 * 60 * 1000;
const LOCK_STALE = 15 * 60 * 1000;

export type DeployState = {
  running: boolean;
  startedAt: string | null;
  log: string;
};

export function deployState(): DeployState {
  let running = false;
  let startedAt: string | null = null;
  try {
    const stat = fs.statSync(LOCK());
    running = Date.now() - stat.mtimeMs < LOCK_STALE;
    startedAt = stat.mtime.toISOString();
  } catch { /* not running */ }

  let log = "";
  try { log = fs.readFileSync(LOG(), "utf8"); } catch { /* nothing yet */ }
  return { running, startedAt, log };
}

function append(line: string) {
  try { fs.appendFileSync(LOG(), line.endsWith("\n") ? line : line + "\n"); } catch { /* ignore */ }
}

async function step(label: string, command: string) {
  append(`\n$ ${label}`);
  try {
    const { stdout, stderr } = await run(command, {
      cwd: ROOT,
      timeout: STEP_TIMEOUT,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, CI: "1" },
    });
    const out = (stdout + stderr).trim();
    // Keep the tail: the interesting part of a build is at the end.
    append(out.split("\n").slice(-25).join("\n"));
    return true;
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
    const out = ((err.stdout || "") + (err.stderr || "") + (err.message || "")).trim();
    append(out.split("\n").slice(-30).join("\n"));
    append(err.killed ? "TIMED OUT" : "FAILED");
    return false;
  }
}

/**
 * Do the update. Returns as soon as it is under way; follow the log to see
 * how it went. Never throws.
 */
export async function startDeploy(triggeredBy: string) {
  const state = deployState();
  if (state.running) return { started: false, reason: "An update is already running." };

  fs.writeFileSync(LOCK(), new Date().toISOString());
  fs.writeFileSync(LOG(), `Update started ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })} by ${triggeredBy}\n`);

  // Deliberately not awaited: the build outlives the web request.
  (async () => {
    try {
      // Take exactly what is on GitHub. Safe because live content lives
      // outside this folder, and it avoids merge conflicts over the
      // starter database file that git tracks.
      const fetched = await step("git fetch", "git fetch origin main");
      if (!fetched) return append("\nCould not reach GitHub. Nothing has changed.");

      const before = (await run("git rev-parse HEAD", { cwd: ROOT })).stdout.trim();
      if (!await step("git reset", "git reset --hard origin/main")) {
        return append("\nCould not update the code. Nothing has changed.");
      }
      const after = (await run("git rev-parse HEAD", { cwd: ROOT })).stdout.trim();

      if (before === after) {
        append("\nAlready up to date. The site was not restarted.");
        return;
      }
      const subject = (await run("git log -1 --format=%s", { cwd: ROOT })).stdout.trim();
      append(`\nUpdating to: ${subject}`);

      if (!await step("npm install", "npm install --no-audit --no-fund")) {
        return append("\nInstalling failed, so the site has NOT been changed. It is still running the previous version.");
      }
      if (!await step("npm run build", "npm run build")) {
        return append("\nThe build failed, so the site has NOT been restarted. It is still running the previous version, safe and online.");
      }

      // Only now, with a good build in hand, bring the new version up.
      fs.mkdirSync(path.join(ROOT, "tmp"), { recursive: true });
      fs.writeFileSync(path.join(ROOT, "tmp", "restart.txt"), new Date().toISOString());
      append("\nDone. The new version is live.");
    } catch (e) {
      append(`\nUnexpected problem: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      try { fs.unlinkSync(LOCK()); } catch { /* already gone */ }
    }
  })();

  return { started: true };
}
