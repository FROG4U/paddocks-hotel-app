import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { startDeploy, deployState } from "@/lib/deploy";

export const dynamic = "force-dynamic";

/**
 * Updates the site to the latest code. Used by the GitHub action so a push
 * publishes itself. Protected by DEPLOY_KEY, set in Plesk; with no key set
 * the address does nothing at all.
 */
function allowed(req: NextRequest) {
  const key = process.env.DEPLOY_KEY;
  if (!key) return false;
  const given = req.headers.get("x-deploy-key") || req.nextUrl.searchParams.get("key") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(key);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!process.env.DEPLOY_KEY) {
    return NextResponse.json({ error: "No DEPLOY_KEY is set on the server." }, { status: 503 });
  }
  if (!allowed(req)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const result = await startDeploy("a push to GitHub");
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  if (!allowed(req)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  return NextResponse.json(deployState());
}
