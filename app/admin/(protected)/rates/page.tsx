import { prisma } from "@/lib/prisma";
import { formatDate, money } from "@/lib/booking";
import { saveRoomRatesAction, savePriceRuleAction, deletePriceRuleAction } from "@/lib/booking-actions";
import { Card, ErrorBanner, SavedBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const input = "border border-black/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy";

function describe(kind: string, value: number) {
  if (kind === "percent") return `${value}% off`;
  if (kind === "amount") return `${money(value)} off a night`;
  return `${money(value)} a night`;
}

export default async function RatesPage({ searchParams }:
  { searchParams: Promise<{ saved?: string; error?: string; edit?: string }> }) {
  const { saved, error, edit } = await searchParams;
  const [rooms, rules] = await Promise.all([
    prisma.room.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { units: true } } } }),
    prisma.priceRule.findMany({ orderBy: [{ active: "desc" }, { start: "asc" }] }),
  ]);
  const editing = rules.find((r) => r.id === edit);

  return (
    <div>
      <h1 className="font-display text-3xl text-navy mb-1">Rates &amp; Discounts</h1>
      <p className="text-ink/60 mb-6">Room prices, how many of each room you have, and discounts on chosen dates.</p>
      <SavedBanner show={saved === "1"} text="Saved - live on the booking page now." />
      <ErrorBanner message={error} />

      <form action={saveRoomRatesAction}>
        <Card title="Rooms, prices and numbers">
          <p className="text-sm text-ink/60 -mt-2">
            <strong>Number of rooms</strong> is how many of that type the hotel can sell on one night, e.g. 6 doubles.
            A room type with no price, or set to 0 rooms, does not appear on the booking page.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-ink/50">
                <tr>
                  <th className="py-2 pr-3">Room</th>
                  <th className="py-2 pr-3">Bookable</th>
                  <th className="py-2 pr-3">Price a night (£)</th>
                  <th className="py-2 pr-3">Sleeps</th>
                  <th className="py-2">Number of rooms</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id} className="border-t border-black/5">
                    <td className="py-2 pr-3 font-medium text-navy whitespace-nowrap">
                      <input type="hidden" name={`present_${r.id}`} value="1" />{r.name}
                    </td>
                    <td className="py-2 pr-3">
                      <input type="checkbox" name={`bookable_${r.id}`} defaultChecked={r.bookable} className="w-4 h-4 accent-[var(--navy)]" />
                    </td>
                    <td className="py-2 pr-3">
                      <input name={`price_${r.id}`} defaultValue={r.basePrice ? (r.basePrice / 100).toFixed(2).replace(/\.00$/, "") : ""}
                        placeholder="e.g. 95" inputMode="decimal" className={`${input} w-28`} />
                    </td>
                    <td className="py-2 pr-3">
                      <input name={`guests_${r.id}`} type="number" min={1} max={12} defaultValue={r.maxGuests} className={`${input} w-20`} />
                    </td>
                    <td className="py-2">
                      <input name={`count_${r.id}`} type="number" min={0} max={50} defaultValue={r._count.units} className={`${input} w-20`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="bg-navy text-white font-semibold rounded-md px-5 py-2.5 hover:bg-navy/90">Save rooms</button>
        </Card>
      </form>

      <Card title="Date discounts">
        <p className="text-sm text-ink/60 -mt-2">
          Lower the price on chosen nights, e.g. 20% off winter weekdays, or a set price over Christmas.
          If two discounts cover the same night the guest gets the better one; they never stack.
        </p>
        {rules.length === 0 && <p className="text-sm text-ink/50">No discounts yet.</p>}
        <ul className="divide-y divide-black/5">
          {rules.map((r) => (
            <li key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-navy">
                  {r.name} {!r.active && <span className="text-xs text-ink/40">(off)</span>}
                </p>
                <p className="text-xs text-ink/60">
                  {describe(r.kind, r.value)} · {formatDate(r.start, { day: "numeric", month: "short", year: "numeric" })} to{" "}
                  {formatDate(r.end, { day: "numeric", month: "short", year: "numeric" })}
                  {" · "}{r.roomId ? rooms.find((x) => x.id === r.roomId)?.name : "All rooms"}
                  {r.weekdays ? ` · ${r.weekdays.split(",").map((d) => DAYS[+d]).join(", ")} only` : ""}
                  {r.minNights > 1 ? ` · ${r.minNights}+ nights` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a href={`/admin/rates?edit=${r.id}#rule-form`} className="text-xs text-ink/60 underline">Edit</a>
                <form action={deletePriceRuleAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs text-accent hover:underline">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <form action={savePriceRuleAction} id="rule-form">
        <input type="hidden" name="id" value={editing?.id || ""} />
        <Card title={editing ? `Edit "${editing.name}"` : "Add a date discount"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Name</span>
              <input name="name" required defaultValue={editing?.name} placeholder="e.g. Winter midweek" className={`${input} w-full`} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Which rooms</span>
              <select name="roomId" defaultValue={editing?.roomId || ""} className={`${input} w-full`}>
                <option value="">All rooms</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">First night</span>
              <input type="date" name="start" required defaultValue={editing?.start} className={`${input} w-full`} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Last night</span>
              <input type="date" name="end" required defaultValue={editing?.end} className={`${input} w-full`} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Type</span>
              <select name="kind" defaultValue={editing?.kind || "percent"} className={`${input} w-full`}>
                <option value="percent">Percentage off</option>
                <option value="amount">Amount off each night (£)</option>
                <option value="price">Set nightly price (£)</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Amount</span>
              <input name="value" required inputMode="decimal"
                defaultValue={editing ? (editing.kind === "percent" ? editing.value : (editing.value / 100).toString()) : ""}
                placeholder="e.g. 20 for 20%, or 15 for £15" className={`${input} w-full`} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Only for stays of at least</span>
              <span className="flex items-center gap-2">
                <input type="number" name="minNights" min={1} defaultValue={editing?.minNights ?? 1} className={`${input} w-20`} />
                <span className="text-ink/60">nights</span>
              </span>
            </label>
          </div>
          <div className="text-sm">
            <span className="block font-medium text-navy mb-1">Days of the week</span>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((d, i) => {
                const onDays = editing?.weekdays ? editing.weekdays.split(",").map(Number) : [0, 1, 2, 3, 4, 5, 6];
                return (
                  <label key={d} className="flex items-center gap-1.5">
                    <input type="checkbox" name={`day_${i}`} defaultChecked={onDays.includes(i)} className="w-4 h-4 accent-[var(--navy)]" />{d}
                  </label>
                );
              })}
            </div>
            <span className="block text-xs text-ink/50 mt-1">Untick Friday and Saturday for a midweek-only offer.</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-navy">
            <input type="checkbox" name="active" defaultChecked={editing?.active ?? true} className="w-4 h-4 accent-[var(--navy)]" />
            Switched on
          </label>
          <div className="flex gap-3">
            <button className="bg-navy text-white font-semibold rounded-md px-5 py-2.5 hover:bg-navy/90">
              {editing ? "Save discount" : "Add discount"}
            </button>
            {editing && <a href="/admin/rates" className="text-sm text-ink/60 self-center underline">Cancel</a>}
          </div>
        </Card>
      </form>
    </div>
  );
}
