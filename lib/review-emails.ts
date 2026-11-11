import "server-only";
import { prisma } from "./prisma";
import { addDays, todayUK } from "./booking";
import { emailConfigured, sendReviewRequest } from "./email";

/**
 * The Google review request that goes out after a guest checks out.
 *
 * This runs whenever an admin page is opened, and from /api/cron/reviews so
 * it can be put on a schedule too. Either way a guest is only ever emailed
 * once, because the booking records when it was sent.
 */

let lastRun = 0;

export async function sendDueReviewEmails(force = false) {
  // Opening several admin pages at once must not mean several runs.
  if (!force && Date.now() - lastRun < 10 * 60 * 1000) return { sent: 0, skipped: true };
  lastRun = Date.now();

  const s = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!s?.reviewEmailEnabled || !s.googleReviewUrl || !emailConfigured()) {
    return { sent: 0, skipped: true };
  }

  const today = todayUK();
  const due = addDays(today, -Math.max(0, s.reviewEmailDelay)); // checked out on or before this

  const bookings = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      reviewEmailSentAt: null,
      guestEmail: { not: "" },
      checkOut: { lte: due, gt: addDays(today, -30) }, // nothing older than a month
    },
    select: { id: true },
    take: 25, // a gentle pace, the rest go on the next run
  });

  let sent = 0;
  for (const b of bookings) {
    if (await sendReviewRequest(b.id)) sent++;
  }
  return { sent, skipped: false, considered: bookings.length };
}
