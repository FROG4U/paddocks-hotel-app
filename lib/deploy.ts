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

// The website's own repository. Public, so the server needs no password to
// read it. Overridable in Plesk if it ever moves.
const REMOTE = process.env.GIT_REMOTE || "https://github.com/FROG4U/paddocks-hotel-app.git";

// Git refuses to work in a folder owned by another user unless told it is
// safe. On a hosting panel that is routinely the case, so say so every time
// rather than leaving a confusing failure.
const q = (v: string) => `'${v.replace(/'/g, "'\\''")}'`;
const GIT = `git -c safe.directory=${q(ROOT)}`;
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

/** Which version is in place, or nothing at all on a brand new checkout. */
async function head(): Promise<string> {
  try {
    return (await run(`${GIT} rev-parse HEAD`, { cwd: ROOT })).stdout.trim();
  } catch {
    return "";
  }
}

/**
 * Connect this copy of the website to GitHub if it is not already.
 *
 * A website put on the server by copying the files up has no connection to
 * GitHub at all, so there is nothing to fetch. Rather than failing and
 * leaving somebody to do it by hand over SSH, the first update makes the
 * connection itself. Nothing is lost doing this: it only adds the link, and
 * files the repository does not know about, uploaded photos and the like,
 * are left exactly where they are.
 */
async function ensureConnected() {
  if (fs.existsSync(path.join(ROOT, ".git"))) return true;

  append("\nThis copy of the website has never been connected to GitHub, so the first update has to connect it. Doing that now.");
  if (!await step("connect to GitHub", `${GIT} -c init.defaultBranch=main init`)) return false;
  // A half finished earlier attempt may have left one behind.
  await run(`${GIT} remote remove origin`, { cwd: ROOT }).catch(() => {});
  return step("point it at the repository", `${GIT} remote add origin ${REMOTE}`);
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
      if (!await ensureConnected()) {
        return append("\nCould not connect the website to GitHub, so nothing has changed. The site is untouched and still online.");
      }

      // Take exactly what is on GitHub. Safe because live content lives
      // outside this folder, and because anything the repository does not
      // track, photos and the database included, is left alone.
      if (!await step("git fetch", `${GIT} fetch origin main`)) {
        return append("\nCould not reach GitHub. Nothing has changed.");
      }

      const before = await head();

      // .env is in the repository, so a reset would replace the server's own
      // copy. Anything secret that has been added to it by hand would go with
      // it, so it is put back exactly as it was.
      const envFile = path.join(ROOT, ".env");
      let envBefore: string | null = null;
      try { envBefore = fs.readFileSync(envFile, "utf8"); } catch { /* none */ }

      if (!await step("git reset", `${GIT} reset --hard FETCH_HEAD`)) {
        return append("\nCould not update the code. Nothing has changed.");
      }

      if (envBefore !== null && fs.readFileSync(envFile, "utf8") !== envBefore) {
        fs.writeFileSync(envFile, envBefore);
        append("Kept this server's own .env rather than the one from GitHub.");
      }
      const after = await head();

      if (before && before === after) {
        append("\nAlready up to date. The site was not restarted.");
        return;
      }
      const subject = await run(`${GIT} log -1 --format=%s`, { cwd: ROOT })
        .then((r) => r.stdout.trim()).catch(() => "");
      if (subject) append(`\nUpdating to: ${subject}`);

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
