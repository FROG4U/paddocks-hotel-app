import { getSettings } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { saveBookingRulesAction } from "@/lib/booking-actions";
import { Card, ErrorBanner, SavedBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

const input = "border border-black/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy w-full";

export default async function BookingRulesPage({ searchParams }:
  { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { saved, error } = await searchParams;
  const [s, waiting] = await Promise.all([
    getSettings(),
    prisma.booking.count({ where: { status: "awaiting_approval" } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl text-navy mb-1">Booking Rules</h1>
      <p className="text-ink/60 mb-6">
        Whether the booking page is open, how bookings are confirmed, your times, and your terms.
      </p>
      <SavedBanner show={saved === "1"} text="Saved. Live on the booking page now." />
      <ErrorBanner message={error} />

      <form action={saveBookingRulesAction}>
        <Card title="Taking bookings">
          <label className="flex items-start gap-2 text-sm text-navy">
            <input type="checkbox" name="bookingOpen" defaultChecked={s.bookingOpen} className="w-4 h-4 mt-0.5 accent-[var(--navy)]" />
            <span>
              The booking page is open
              <span className="block text-xs text-ink/50">
                Untick to stop taking bookings, over a refurbishment or a full weekend for instance.
                Guests then see the message below instead of the calendar.
              </span>
            </span>
          </label>
          <label className="block text-sm">
            <span className="block font-medium text-navy mb-1">What guests see when booking is closed</span>
            <input name="bookingClosedNote" defaultValue={s.bookingClosedNote} className={input} />
          </label>
        </Card>

        <Card title="Confirming bookings">
          <label className="flex items-start gap-2 text-sm text-navy">
            <input type="checkbox" name="requireApproval" defaultChecked={s.requireApproval} className="w-4 h-4 mt-0.5 accent-[var(--navy)]" />
            <span>
              I approve each booking myself
              <span className="block text-xs text-ink/50">
                Recommended. The guest&rsquo;s card is held but not charged, and they are told their
                request is with you. Nothing is taken until you press Approve. Untick it and bookings
                are charged and confirmed the moment a guest pays.
              </span>
            </span>
          </label>
          {waiting > 0 && (
            <p className="text-sm bg-cream rounded-md px-4 py-2.5 text-ink/80">
              {waiting} booking{waiting === 1 ? " is" : "s are"} waiting for you in{" "}
              <a href="/admin/bookings?show=awaiting" className="underline text-navy">Bookings</a>.
            </p>
          )}
          <p className="text-xs text-ink/50">
            A card authorisation lasts about 7 days. Approve within that and the payment goes
            through; after it, the hold lapses and you would need to take payment another way.
          </p>
        </Card>

        <Card title="Arrival and departure">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Check in from</span>
              <input name="checkInTime" defaultValue={s.checkInTime} placeholder="e.g. 3pm" className={input} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Check out by</span>
              <input name="checkOutTime" defaultValue={s.checkOutTime} placeholder="e.g. 11am" className={input} />
            </label>
          </div>
          <p className="text-xs text-ink/50">Shown when guests book and repeated in their confirmation email.</p>
        </Card>

        <Card title="Booking terms">
          <label className="block text-sm">
            <span className="block font-medium text-navy mb-1">Terms and conditions</span>
            <textarea name="termsText" defaultValue={s.termsText} rows={10} className={input}
              placeholder={"Cancellations, deposits, pets, smoking, damages and anything else guests should agree to.\n\nOne point per line."} />
            <span className="block text-xs text-ink/50 mt-1">
              Guests must tick to accept these before they can pay, and the time they accepted is
              recorded against the booking. A room can have its own terms instead, set on that
              room&rsquo;s page under Room Pages.
            </span>
          </label>
        </Card>

        <Card title="Marketing opt in">
          <label className="block text-sm">
            <span className="block font-medium text-navy mb-1">Wording of the tick box on the booking form</span>
            <input name="marketingOptInText" defaultValue={s.marketingOptInText} className={input} />
            <span className="block text-xs text-ink/50 mt-1">
              Left unticked by default, as the law requires. Everyone who opts in is listed under
              Marketing List, ready to export.
            </span>
          </label>
        </Card>

        <button className="bg-navy text-white font-semibold rounded-md px-6 py-3 hover:bg-navy/90">Save</button>
      </form>
    </div>
  );
}
