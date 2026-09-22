import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { todayUK, addDays } from "@/lib/booking";
import { createPhoneBookingAction } from "@/lib/booking-actions";
import { Card, ErrorBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

const input = "border border-black/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy w-full";

export default async function NewPhoneBooking({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [rooms, plans] = await Promise.all([
    prisma.room.findMany({ orderBy: { order: "asc" }, include: { units: { where: { active: true }, orderBy: { order: "asc" } } } }),
    prisma.mealPlan.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);
  const today = todayUK();

  return (
    <div>
      <Link href="/admin/bookings" className="text-sm text-ink/50 hover:text-navy">&larr; All bookings</Link>
      <h1 className="font-display text-3xl text-navy mt-2 mb-1">Phone booking</h1>
      <p className="text-ink/60 mb-6">
        For bookings taken by phone or at reception. The room is blocked on the website and on connected calendars straight away.
        Payment is taken however you normally do.
      </p>
      <ErrorBanner message={error} />

      <form action={createPhoneBookingAction}>
        <Card title="Stay">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="block font-medium text-navy mb-1">Room</span>
              <select name="roomId" required className={input}>
                {rooms.filter((r) => r.units.length).map((r) => <option key={r.id} value={r.id}>{r.name} ({r.units.length} room{r.units.length === 1 ? "" : "s"})</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Arrive</span>
              <input type="date" name="checkIn" required defaultValue={today} className={input} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Leave</span>
              <input type="date" name="checkOut" required defaultValue={addDays(today, 1)} className={input} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Adults</span>
              <input type="number" name="adults" min={1} defaultValue={2} className={input} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Children</span>
              <input type="number" name="children" min={0} defaultValue={0} className={input} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Meals</span>
              <select name="mealPlanId" className={input}>
                <option value="">Room only</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Discount code (optional)</span>
              <input name="promoCode" className={`${input} uppercase`} />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="block font-medium text-navy mb-1">Agreed total (£, optional)</span>
              <input name="totalOverride" inputMode="decimal" placeholder="Leave blank to use the normal price" className={input} />
            </label>
          </div>
        </Card>

        <Card title="Guest">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm"><span className="block font-medium text-navy mb-1">Name</span><input name="guestName" required className={input} /></label>
            <label className="block text-sm"><span className="block font-medium text-navy mb-1">Phone</span><input name="guestPhone" className={input} /></label>
            <label className="block text-sm sm:col-span-2"><span className="block font-medium text-navy mb-1">Email</span><input type="email" name="guestEmail" className={input} /></label>
            <label className="block text-sm sm:col-span-2"><span className="block font-medium text-navy mb-1">Notes</span><textarea name="notes" rows={3} className={input} /></label>
          </div>
        </Card>

        <button className="bg-navy text-white font-semibold rounded-md px-6 py-3 hover:bg-navy/90">Create booking</button>
      </form>
    </div>
  );
}
