import { getSettings } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { emailConfigured, verifyEmail } from "@/lib/email";
import { saveReviewEmailAction, sendTestEmailAction } from "@/lib/booking-actions";
import { Card, ErrorBanner, SavedBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

const input = "border border-black/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy w-full";

export default async function ReviewEmailsPage({ searchParams }:
  { searchParams: Promise<{ saved?: string; error?: string; tested?: string }> }) {
  const { saved, error, tested } = await searchParams;
  const [s, sentCount, check] = await Promise.all([
    getSettings(),
    prisma.booking.count({ where: { reviewEmailSentAt: { not: null } } }),
    emailConfigured() ? verifyEmail() : Promise.resolve(null),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl text-navy mb-1">Emails</h1>
      <p className="text-ink/60 mb-6">
        What guests are sent, and what you are told about.
      </p>
      <SavedBanner show={saved === "1"} text="Saved." />
      <SavedBanner show={tested === "1"} text={`Test email sent to ${s.email}. Have a look in that inbox.`} />
      <ErrorBanner message={error} />

      <Card title="Mailbox">
        <p className={`text-sm rounded-md px-4 py-3 ${check?.ok ? "bg-green-600 text-white" : "bg-amber-100 text-amber-900"}`}>
          {check ? check.message : "No mailbox is set up, so the website is not sending any email at all. Guests get no confirmation and no review request."}
        </p>
        {!check?.ok && (
          <>
            <p className="text-sm text-ink/70">
              Add these in Plesk under the domain, then Node.js, then Custom environment variables,
              and restart the app. Use your own hotel mailbox, the same details as Outlook or your phone:
            </p>
            <ul className="text-sm text-ink/70 list-disc pl-5 space-y-1">
              <li><code className="bg-cream px-1 rounded">SMTP_HOST</code> e.g. smtp.ionos.co.uk</li>
              <li><code className="bg-cream px-1 rounded">SMTP_PORT</code> 465</li>
              <li><code className="bg-cream px-1 rounded">SMTP_USER</code> {s.email || "reception@paddockshotel.com"}</li>
              <li><code className="bg-cream px-1 rounded">SMTP_PASSWORD</code> that mailbox&rsquo;s password</li>
            </ul>
            <p className="text-xs text-ink/50">
              The password lives in Plesk only. It is never stored in the website or its code.
            </p>
          </>
        )}
        <form action={sendTestEmailAction}>
          <button disabled={!emailConfigured()}
            className="border border-navy text-navy font-semibold rounded-md px-5 py-2.5 hover:bg-navy hover:text-white disabled:opacity-40">
            Send a test email to {s.email || "the hotel"}
          </button>
        </form>
      </Card>

      <form action={saveReviewEmailAction}>
        <Card title="Who the emails come from">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Name guests see</span>
              <input name="emailFromName" defaultValue={s.emailFromName} className={input} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Address guests see</span>
              <input name="emailFromAddr" defaultValue={s.emailFromAddr} placeholder={s.email} className={input} />
              <span className="block text-xs text-ink/50 mt-1">Leave blank to use {s.email}.</span>
            </label>
          </div>
        </Card>

        <Card title="What you are told about">
          <label className="block text-sm">
            <span className="block font-medium text-navy mb-1">Send my notifications to</span>
            <input name="notifyEmail" defaultValue={s.notifyEmail} placeholder={s.email} className={input} />
            <span className="block text-xs text-ink/50 mt-1">
              Leave blank to use {s.email}. Put a different address here if you would rather these
              went somewhere else, like a phone you check.
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-navy">
            <input type="checkbox" name="notifyOnBooking" defaultChecked={s.notifyOnBooking} className="w-4 h-4 mt-0.5 accent-[var(--navy)]" />
            <span>
              Email me when a booking comes in
              <span className="block text-xs text-ink/50">
                With the guest, the dates, the room and the total, and a link straight to it. When
                you approve bookings yourself, this is how you know one is waiting.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-navy">
            <input type="checkbox" name="notifyOnMessage" defaultChecked={s.notifyOnMessage} className="w-4 h-4 mt-0.5 accent-[var(--navy)]" />
            <span>
              Email me when someone sends an enquiry
              <span className="block text-xs text-ink/50">
                From the contact form, and from the chat window when it is not connected to AI.
              </span>
            </span>
          </label>
        </Card>

        <Card title="What guests are sent">
          <ul className="text-sm text-ink/70 list-disc pl-5 space-y-1 -mt-2">
            <li><strong>When they book</strong> - their request, or their confirmation if you are not approving by hand.</li>
            <li><strong>When you approve</strong> - confirmed, with the dates, room, times and total.</li>
            <li><strong>When you decline</strong> - an apology, with your reason if you give one, and a note that nothing was charged.</li>
            <li><strong>When you cancel a confirmed booking</strong> - with the refund amount if you refunded one. You can turn this off per cancellation.</li>
            <li><strong>After they check out</strong> - the review request below, if you switch it on.</li>
          </ul>
          <p className="text-xs text-ink/50">All in your own colours, from your own address.</p>
        </Card>

        <Card title="Google review request">
          <label className="flex items-start gap-2 text-sm text-navy">
            <input type="checkbox" name="reviewEmailEnabled" defaultChecked={s.reviewEmailEnabled} className="w-4 h-4 mt-0.5 accent-[var(--navy)]" />
            <span>
              Email guests after they check out, asking for a Google review
              <span className="block text-xs text-ink/50">
                Only guests who actually stayed, only once each, and only when a review link is set below.
              </span>
            </span>
          </label>

          <label className="block text-sm">
            <span className="block font-medium text-navy mb-1">Your Google review link</span>
            <input name="googleReviewUrl" defaultValue={s.googleReviewUrl} placeholder="https://g.page/r/..." className={`${input} font-mono text-xs`} />
            <span className="block text-xs text-ink/50 mt-1">
              In Google Business Profile choose &ldquo;Ask for reviews&rdquo; and copy the short link it gives you.
            </span>
          </label>

          <label className="block text-sm max-w-xs">
            <span className="block font-medium text-navy mb-1">Send how long after checkout?</span>
            <span className="flex items-center gap-2">
              <input type="number" name="reviewEmailDelay" min={0} max={30} defaultValue={s.reviewEmailDelay}
                className="border border-black/15 rounded-md px-3 py-2 w-24" />
              <span className="text-ink/60">day(s)</span>
            </span>
          </label>

          <label className="block text-sm">
            <span className="block font-medium text-navy mb-1">Subject</span>
            <input name="reviewEmailSubject" defaultValue={s.reviewEmailSubject} className={input} />
          </label>

          <label className="block text-sm">
            <span className="block font-medium text-navy mb-1">Message</span>
            <textarea name="reviewEmailBody" defaultValue={s.reviewEmailBody} rows={6} className={input}
              placeholder="Leave blank to use our friendly default wording. One paragraph per line." />
            <span className="block text-xs text-ink/50 mt-1">
              The guest&rsquo;s first name and the review button are added automatically.
            </span>
          </label>

          <p className="text-xs text-ink/50">
            {sentCount > 0 ? `${sentCount} review request${sentCount === 1 ? " has" : "s have"} gone out so far. ` : ""}
            These send whenever you open the admin, so no extra setup is needed. If you would rather
            they went out without anyone logging in, there is a scheduled task you can set up in
            Plesk and I can talk you through it.
          </p>
        </Card>

        <button className="bg-navy text-white font-semibold rounded-md px-6 py-3 hover:bg-navy/90">Save</button>
      </form>
    </div>
  );
}
