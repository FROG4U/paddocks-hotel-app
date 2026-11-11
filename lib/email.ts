import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { formatDate, money } from "./booking";

/**
 * Sending email to guests.
 *
 * We send through Resend. It goes out over an ordinary web request, so
 * nothing depends on the server's mail ports being open, and because the
 * domain is signed properly, far less of it lands in a guest's spam folder
 * than it would from a shared hotel mailbox.
 *
 * The key is an environment variable set in Plesk, never the database, so it
 * never reaches the git repository:
 *
 *   RESEND_API_KEY   the re_... key from resend.com
 *
 * An ordinary mailbox still works instead if it is ever wanted, using
 * SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD.
 *
 * With neither set, the site simply does not send email. Everything else
 * carries on working and the admin screens say so plainly.
 */

export type EmailProvider = "resend" | "smtp" | null;

export function emailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) return "smtp";
  return null;
}

export function emailConfigured() {
  return emailProvider() !== null;
}

function transport() {
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
  });
}

async function resend(path: string, init?: RequestInit) {
  return fetch(`https://api.resend.com${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

/** The domain part of whatever address guests will see us sending from. */
function domainOf(addr: string) {
  return (addr.split("@")[1] || "").trim().toLowerCase();
}

/**
 * Check email is actually working, for the admin screen. With Resend this is
 * worth more than a connection test: it also says whether the domain has been
 * verified, which is the thing that quietly stops email going out.
 */
export async function verifyEmail(): Promise<{ ok: boolean; message: string }> {
  const provider = emailProvider();
  if (!provider) {
    return { ok: false, message: "No email account is set up yet, so no email is being sent." };
  }

  if (provider === "smtp") {
    try {
      await transport().verify();
      return { ok: true, message: `Connected to ${process.env.SMTP_HOST} as ${process.env.SMTP_USER}. Email is working.` };
    } catch (e) {
      return { ok: false, message: `The mailbox refused the connection: ${e instanceof Error ? e.message : "unknown error"}` };
    }
  }

  try {
    const res = await resend("/domains");
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "Resend did not recognise that key. Check it was pasted in full, and that the app has been restarted since it was added." };
    }
    if (!res.ok) {
      return { ok: false, message: `Resend answered with an error (${res.status}). Worth trying again in a moment.` };
    }
    const body = await res.json() as { data?: { name: string; status: string }[] };
    const domains = body.data || [];
    const s = await prisma.siteSettings.findUnique({ where: { id: 1 }, select: { emailFromAddr: true, email: true } });
    const sending = domainOf(s?.emailFromAddr || s?.email || "");
    if (!sending) return { ok: true, message: "Resend is connected." };

    const match = domains.find((d) => d.name.toLowerCase() === sending);
    if (!match) {
      return {
        ok: false,
        message: `Resend is connected, but ${sending} has not been added to it, so anything sent from that address will be refused. Add the domain in Resend and put the DNS records it gives you into IONOS.`,
      };
    }
    if (match.status !== "verified") {
      return {
        ok: false,
        message: `Resend is connected and ${sending} has been added, but it is still showing as "${match.status}". The DNS records need to go into IONOS, then press Verify in Resend. It can take up to an hour to come through.`,
      };
    }
    return { ok: true, message: `Resend is connected and ${sending} is verified. Email is working.` };
  } catch (e) {
    return { ok: false, message: `Could not reach Resend: ${e instanceof Error ? e.message : "unknown error"}` };
  }
}

type SendArgs = { to: string; subject: string; heading: string; body: string[]; button?: { label: string; url: string } };

/** One plain, readable layout for every email we send. */
function html(s: { siteName: string; phone: string; email: string; navy: string; gold: string },
  args: SendArgs) {
  const paragraphs = args.body
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6;color:#1b252f;font-size:15px">${p}</p>`)
    .join("");
  const button = args.button
    ? `<p style="margin:28px 0"><a href="${args.button.url}" style="background:${s.gold};color:${s.navy};text-decoration:none;font-weight:bold;padding:14px 28px;display:inline-block">${args.button.label}</a></p>`
    : "";

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6ede3">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6ede3;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
<tr><td style="background:${s.navy};padding:24px;text-align:center">
  <span style="color:#ffffff;font-size:20px;letter-spacing:2px;text-transform:uppercase">${s.siteName}</span>
</td></tr>
<tr><td style="padding:32px 28px">
  <h1 style="margin:0 0 20px;font-size:21px;color:${s.navy};font-weight:normal">${args.heading}</h1>
  ${paragraphs}${button}
</td></tr>
<tr><td style="background:#f6ede3;padding:20px 28px;text-align:center;color:#55606c;font-size:13px;line-height:1.6">
  ${s.siteName}<br>${s.phone} &nbsp;|&nbsp; <a href="mailto:${s.email}" style="color:#55606c">${s.email}</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

/** Send one email. Never throws: a failure must not lose a booking. */
export async function sendEmail(args: SendArgs): Promise<boolean> {
  if (!emailConfigured() || !args.to) return false;
  try {
    const s = await prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (!s) return false;
    const brand = {
      siteName: s.siteName, phone: s.phone, email: s.email,
      navy: s.navyColor || "#0a416c", gold: s.goldColor || "#ba9667",
    };
    const addr = s.emailFromAddr || process.env.SMTP_USER || s.email;
    const from = `"${s.emailFromName || s.siteName}" <${addr}>`;
    const text = `${args.heading}\n\n${args.body.join("\n\n").replace(/<[^>]+>/g, "")}` +
      (args.button ? `\n\n${args.button.label}: ${args.button.url}` : "") +
      `\n\n${s.siteName}\n${s.phone}\n${s.email}`;

    if (emailProvider() === "resend") {
      const res = await resend("/emails", {
        method: "POST",
        body: JSON.stringify({
          from,
          to: [args.to],
          reply_to: s.email || undefined,
          subject: args.subject,
          text,
          html: html(brand, args),
        }),
      });
      if (!res.ok) {
        console.error("Resend refused the email:", res.status, (await res.text()).slice(0, 500));
        return false;
      }
      return true;
    }

    await transport().sendMail({
      from,
      to: args.to,
      replyTo: s.email || undefined,
      subject: args.subject,
      text,
      html: html(brand, args),
    });
    return true;
  } catch (e) {
    console.error("Email failed to send:", e);
    return false;
  }
}

/** Record which emails a booking has had, so none is sent twice. */
async function markSent(bookingId: string, kind: string) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, select: { guestEmailsSent: true } });
  const sent = new Set((b?.guestEmailsSent || "").split(",").filter(Boolean));
  sent.add(kind);
  await prisma.booking.update({ where: { id: bookingId }, data: { guestEmailsSent: [...sent].join(",") } });
}

type BookingWithRoom = Awaited<ReturnType<typeof bookingFor>>;
function bookingFor(id: string) {
  return prisma.booking.findUnique({ where: { id }, include: { room: true } });
}

function stayLines(b: NonNullable<BookingWithRoom>, s: { checkInTime: string; checkOutTime: string }) {
  return [
    `<strong>${b.room.name}</strong><br>` +
    `Arrive ${formatDate(b.checkIn)} from ${s.checkInTime}<br>` +
    `Leave ${formatDate(b.checkOut)} by ${s.checkOutTime}<br>` +
    `${b.nights} night${b.nights === 1 ? "" : "s"}, ${b.adults} adult${b.adults === 1 ? "" : "s"}` +
    `${b.children ? ` and ${b.children} child${b.children === 1 ? "" : "ren"}` : ""}<br>` +
    `${b.mealPlanName}<br>` +
    `Total ${money(b.total)}<br>` +
    `Reference <strong>${b.reference}</strong>`,
  ];
}

/** "We have your request" - sent as soon as a booking is made. */
export async function sendBookingReceived(bookingId: string) {
  const [b, s] = await Promise.all([bookingFor(bookingId), prisma.siteSettings.findUnique({ where: { id: 1 } })]);
  if (!b || !s) return;

  const waiting = b.status === "awaiting_approval";
  const ok = await sendEmail({
    to: b.guestEmail,
    subject: waiting
      ? `We have your booking request - ${b.reference}`
      : `Your booking is confirmed - ${b.reference}`,
    heading: waiting ? `Thank you, ${b.guestName.split(" ")[0]}` : `You are booked in, ${b.guestName.split(" ")[0]}`,
    body: [
      waiting
        ? "Thank you for choosing us. We have your request and one of the team will confirm it shortly, usually the same day. Your card has been authorised but nothing has been taken yet."
        : "Thank you for booking with us. Everything is confirmed and we look forward to seeing you.",
      ...stayLines(b, s),
      "If you need to change anything, just reply to this email or give us a ring.",
    ],
  });
  if (ok) await markSent(bookingId, "received");
}

/** "Your booking is confirmed" - sent when the hotel approves it. */
export async function sendBookingApproved(bookingId: string) {
  const [b, s] = await Promise.all([bookingFor(bookingId), prisma.siteSettings.findUnique({ where: { id: 1 } })]);
  if (!b || !s) return;

  const ok = await sendEmail({
    to: b.guestEmail,
    subject: `Your booking is confirmed - ${b.reference}`,
    heading: `You are all set, ${b.guestName.split(" ")[0]}`,
    body: [
      "Your booking is confirmed and your card has now been charged. We look forward to welcoming you.",
      ...stayLines(b, s),
      s.addressLine1
        ? `You will find us at ${s.addressLine1}, ${s.addressLine2}, ${s.town} ${s.postcode}. There is free parking on site.`
        : "",
    ].filter(Boolean),
  });
  if (ok) await markSent(bookingId, "approved");
}

/** "We are sorry" - sent when the hotel cannot take the booking. */
export async function sendBookingDeclined(bookingId: string) {
  const [b, s] = await Promise.all([bookingFor(bookingId), prisma.siteSettings.findUnique({ where: { id: 1 } })]);
  if (!b || !s) return;

  const ok = await sendEmail({
    to: b.guestEmail,
    subject: `About your booking request - ${b.reference}`,
    heading: "We are very sorry",
    body: [
      `Unfortunately we are not able to take your booking for ${formatDate(b.checkIn)}.`,
      b.declinedReason ? `<em>${b.declinedReason}</em>` : "",
      "Nothing has been charged. The authorisation on your card has been released and any hold will clear within a few days.",
      `Do please call us on ${s.phone} if you would like to look at other dates. We would be glad to help.`,
    ].filter(Boolean),
  });
  if (ok) await markSent(bookingId, "declined");
}

/** The Google review request, the day after checkout. */
export async function sendReviewRequest(bookingId: string) {
  const [b, s] = await Promise.all([bookingFor(bookingId), prisma.siteSettings.findUnique({ where: { id: 1 } })]);
  if (!b || !s || !s.googleReviewUrl) return false;

  const custom = s.reviewEmailBody.trim();
  const ok = await sendEmail({
    to: b.guestEmail,
    subject: s.reviewEmailSubject || `How was your stay at ${s.siteName}?`,
    heading: `Thank you for staying with us, ${b.guestName.split(" ")[0]}`,
    body: custom
      ? custom.split("\n").filter(Boolean)
      : [
          "We hope you enjoyed your time in the Wye Valley and that you travelled home safely.",
          "If you have a minute, a short review on Google would mean a great deal to us. We are a small family run hotel and it genuinely helps other people find us.",
          "Thank you again, and we hope to see you back before long.",
        ],
    button: { label: "Leave a review", url: s.googleReviewUrl },
  });
  if (ok) {
    await prisma.booking.update({ where: { id: bookingId }, data: { reviewEmailSentAt: new Date() } });
    await markSent(bookingId, "review");
  }
  return ok;
}

/** Tell the hotel a booking has come in. */
export async function notifyHotel(bookingId: string) {
  const [b, s] = await Promise.all([bookingFor(bookingId), prisma.siteSettings.findUnique({ where: { id: 1 } })]);
  if (!b || !s) return;
  const to = s.notifyEmail || s.email;
  if (!to || !s.notifyOnBooking) return;

  await sendEmail({
    to,
    subject: `${b.status === "awaiting_approval" ? "Booking to approve" : "New booking"}: ${b.guestName}, ${formatDate(b.checkIn, { day: "numeric", month: "short" })}`,
    heading: b.status === "awaiting_approval" ? "A booking is waiting for your approval" : "New booking",
    body: [
      ...stayLines(b, s),
      `${b.guestName}<br>${b.guestEmail}${b.guestPhone ? `<br>${b.guestPhone}` : ""}`,
      b.notes ? `Their note: ${b.notes}` : "",
    ].filter(Boolean),
    button: { label: "Open the booking", url: `${(s.siteUrl || "").replace(/\/$/, "")}/admin/bookings/${b.id}` },
  });
}

/** "Your booking has been cancelled" - sent when the hotel cancels a stay. */
export async function sendBookingCancelled(bookingId: string, refunded: number) {
  const [b, s] = await Promise.all([bookingFor(bookingId), prisma.siteSettings.findUnique({ where: { id: 1 } })]);
  if (!b || !s) return;

  const ok = await sendEmail({
    to: b.guestEmail,
    subject: `Your booking has been cancelled - ${b.reference}`,
    heading: "Your booking has been cancelled",
    body: [
      `We are sorry to let you know that your stay on ${formatDate(b.checkIn)} has been cancelled.`,
      ...stayLines(b, s),
      refunded > 0
        ? `We have refunded ${money(refunded)} to the card you paid with. It usually takes three to five working days to appear on your statement.`
        : "If a refund is due, we will be in touch about it separately.",
      `If this is not what you expected, please call us on ${s.phone} and we will put it right.`,
    ],
  });
  if (ok) await markSent(bookingId, "cancelled");
}

/** Tell the hotel somebody has sent an enquiry through the website. */
export async function notifyNewMessage(messageId: string) {
  const [m, s] = await Promise.all([
    prisma.message.findUnique({ where: { id: messageId } }),
    prisma.siteSettings.findUnique({ where: { id: 1 } }),
  ]);
  if (!m || !s) return;
  const to = s.notifyEmail || s.email;
  if (!to || !s.notifyOnMessage) return;

  await sendEmail({
    to,
    subject: `Website enquiry from ${m.name}${m.subject ? ` about ${m.subject}` : ""}`,
    heading: "Someone has sent you a message",
    body: [
      `<strong>${m.name}</strong>${m.email ? `<br>${m.email}` : ""}${m.phone ? `<br>${m.phone}` : ""}` +
        `${m.subject ? `<br>About: ${m.subject}` : ""}`,
      m.body.replace(/\n/g, "<br>"),
      m.email ? `Reply straight to <a href="mailto:${m.email}">${m.email}</a>.` : "",
    ].filter(Boolean),
    button: { label: "Open your inbox", url: `${(s.siteUrl || "").replace(/\/$/, "")}/admin/messages` },
  });
}
