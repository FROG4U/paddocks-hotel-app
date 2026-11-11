import { NextRequest, NextResponse } from "next/server";
import { sendDueReviewEmails } from "@/lib/review-emails";

export const dynamic = "force-dynamic";

/**
 * Sends any review emails that are due. The site also does this whenever an
 * admin page is opened, so this is only needed if you want it to happen
 * without anyone logging in. In Plesk, Scheduled Tasks, fetch this address
 * once a day:
 *
 *   https://paddockshotel.com/api/cron/reviews?key=YOUR_KEY
 *
 * where YOUR_KEY matches the CRON_KEY environment variable. Without a
 * CRON_KEY set the address does nothing, so it cannot be abused.
 */
export async function GET(req: NextRequest) {
  const key = process.env.CRON_KEY;
  if (!key) return NextResponse.json({ error: "No CRON_KEY is set." }, { status: 503 });
  if (req.nextUrl.searchParams.get("key") !== key) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const result = await sendDueReviewEmails(true);
  return NextResponse.json(result);
}
