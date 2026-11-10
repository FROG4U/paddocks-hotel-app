import Link from "next/link";
import { getSettings } from "@/lib/data";
import { checkEmbeddable, looksLikeUrl } from "@/lib/innroad";
import { saveBookingModeAction } from "@/lib/booking-actions";
import { Card, ErrorBanner, SavedBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

const input = "border border-black/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy w-full";

export default async function BookingSystemPage({ searchParams }:
  { searchParams: Promise<{ saved?: string; error?: string; tested?: string }> }) {
  const { saved, error, tested } = await searchParams;
  const s = await getSettings();

  // Only check innRoad when asked, so opening this page is never slow.
  const check = tested === "1" && s.innRoadUrl
    ? await checkEmbeddable(s.innRoadUrl, s.siteUrl)
    : null;

  return (
    <div>
      <h1 className="font-display text-3xl text-navy mb-1">Booking System</h1>
      <p className="text-ink/60 mb-6">
        Where room bookings are taken. Only one system can be in use at a time, so the same room
        can never be sold twice.
      </p>
      <SavedBanner show={saved === "1"} text="Saved. The booking page is live with this now." />
      <ErrorBanner message={error} />

      {check && (
        <div className={`mb-5 rounded-md text-sm px-4 py-3 ${
          check.canEmbed ? "bg-green-600 text-white" : check.ok ? "bg-amber-100 text-amber-900" : "bg-red-600 text-white"}`}>
          {check.reason}
          {check.ok && !check.canEmbed && " Untick the box below and guests will get a button instead."}
        </div>
      )}

      <form action={saveBookingModeAction}>
        <Card title="How guests book">
          <div className="space-y-3">
            <Mode value="innroad" current={s.bookingMode}
              title="Through innRoad"
              detail="Our Book buttons lead to the hotel's innRoad booking engine. Bookings land in innRoad alongside the ones from Booking.com, so there is one diary and no clashes. Recommended while the hotel runs innRoad." />
            <Mode value="builtin" current={s.bookingMode}
              title="This website's own booking system"
              detail="The calendar, prices, meal plans and discount codes built into this site, with card payment by Stripe. Do not use this at the same time as innRoad: two systems selling the same rooms will double book." />
            <Mode value="phone" current={s.bookingMode}
              title="No online booking"
              detail="The booking page simply asks guests to call or email." />
          </div>
        </Card>

        <Card title="innRoad">
          <label className="block text-sm">
            <span className="block font-medium text-navy mb-1">Booking engine address</span>
            <input name="innRoadUrl" defaultValue={s.innRoadUrl} placeholder="https://..."
              className={`${input} font-mono text-xs`} />
            <span className="block text-xs text-ink/50 mt-1">
              In innRoad this is your booking engine or &ldquo;book now&rdquo; link, the one you would give
              Facebook or Google. Paste the whole address.
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-navy">
            <input type="checkbox" name="innRoadEmbed" defaultChecked={s.innRoadEmbed} className="w-4 h-4 mt-0.5 accent-[var(--navy)]" />
            <span>
              Show the booking engine inside our own page
              <span className="block text-xs text-ink/50">
                Guests stay on paddockshotel.com under your header and footer. Left off for now:
                innRoad&rsquo;s booking engine runs a Cloudflare security check that can fail inside
                a frame, which would show guests an empty box. Tick it, save, then open the booking
                page yourself and make sure the form really appears before leaving it on.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-3 items-center">
            <button className="bg-navy text-white font-semibold rounded-md px-5 py-2.5 hover:bg-navy/90">
              Save
            </button>
            <button name="test" value="1"
              className="border border-navy text-navy font-semibold rounded-md px-5 py-2.5 hover:bg-navy hover:text-white">
              Save and test
            </button>
            {looksLikeUrl(s.innRoadUrl) && (
              <a href={s.innRoadUrl} target="_blank" rel="noopener" className="text-sm text-ink/60 underline">
                Open the booking engine
              </a>
            )}
          </div>
        </Card>
      </form>

      {s.bookingMode === "innroad" && (
        <Card title="What this means day to day">
          <ul className="text-sm text-ink/70 list-disc pl-5 space-y-1.5">
            <li>Rooms, prices and availability are managed in innRoad, not here.</li>
            <li>Website bookings appear in innRoad with your Booking.com and Expedia ones.</li>
            <li>Payment is taken however innRoad is set up to take it. Stripe here is not used.</li>
            <li>
              This site&rsquo;s own booking pages (Bookings, Calendar, Rates, Meal Plans, Discount
              Codes, Channel Sync) are switched off and hidden. Nothing is deleted, so you can turn
              them back on any time by choosing the other option above.
            </li>
          </ul>
        </Card>
      )}

      <p className="text-xs text-ink/50">
        The header&rsquo;s Book button goes to{" "}
        <Link href="/admin/settings" className="underline">whatever you set in Contact &amp; Settings</Link>.
        Point it at <code className="bg-cream px-1 rounded">/book</code> so it always follows the
        choice you make here.
      </p>
    </div>
  );
}

function Mode({ value, current, title, detail }: {
  value: string; current: string; title: string; detail: string;
}) {
  const on = current === value;
  return (
    <label className={`block rounded-lg border-2 px-4 py-3 cursor-pointer transition ${
      on ? "border-navy bg-navy/5" : "border-black/10 hover:border-gold"}`}>
      <span className="flex items-start gap-3">
        <input type="radio" name="bookingMode" value={value} defaultChecked={on}
          className="w-4 h-4 mt-1 accent-[var(--navy)]" />
        <span>
          <span className="block font-semibold text-navy">{title}</span>
          <span className="block text-xs text-ink/60 mt-0.5">{detail}</span>
        </span>
      </span>
    </label>
  );
}
