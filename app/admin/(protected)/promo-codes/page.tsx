import { prisma } from "@/lib/prisma";
import { formatDate, money } from "@/lib/booking";
import { savePromoAction, deletePromoAction } from "@/lib/booking-actions";
import { Card, ErrorBanner, SavedBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

const input = "border border-black/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy w-full";
const short = (d: string) => formatDate(d, { day: "numeric", month: "short", year: "numeric" });

export default async function PromoCodesPage({ searchParams }:
  { searchParams: Promise<{ saved?: string; error?: string; edit?: string }> }) {
  const { saved, error, edit } = await searchParams;
  const codes = await prisma.promoCode.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] });
  const editing = codes.find((c) => c.id === edit);

  return (
    <div>
      <h1 className="font-display text-3xl text-navy mb-1">Discount Codes</h1>
      <p className="text-ink/60 mb-6">
        Codes you hand out, which guests type in when they book. They come off the whole stay, including meals.
      </p>
      <SavedBanner show={saved === "1"} text="Saved." />
      <ErrorBanner message={error} />

      <Card title="Your codes">
        {codes.length === 0 && <p className="text-sm text-ink/50">No codes yet.</p>}
        <ul className="divide-y divide-black/5">
          {codes.map((c) => (
            <li key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono font-semibold text-navy tracking-wide">
                  {c.code} {!c.active && <span className="font-sans text-xs text-ink/40">(off)</span>}
                </p>
                <p className="text-xs text-ink/60">
                  {c.kind === "percent" ? `${c.value}% off` : `${money(c.value)} off`}
                  {c.validFrom || c.validTo
                    ? ` · arrivals ${c.validFrom ? `from ${short(c.validFrom)}` : ""}${c.validFrom && c.validTo ? " " : ""}${c.validTo ? `to ${short(c.validTo)}` : ""}`
                    : " · any dates"}
                  {c.minNights > 1 ? ` · ${c.minNights}+ nights` : ""}
                  {" · "}used {c.uses}{c.maxUses ? ` of ${c.maxUses}` : ""} time{c.uses === 1 ? "" : "s"}
                  {c.note ? ` · ${c.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a href={`/admin/promo-codes?edit=${c.id}#code-form`} className="text-xs text-ink/60 underline">Edit</a>
                <form action={deletePromoAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-xs text-accent hover:underline">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <form action={savePromoAction} id="code-form">
        <input type="hidden" name="id" value={editing?.id || ""} />
        <Card title={editing ? `Edit ${editing.code}` : "Create a code"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Code</span>
              <input name="code" required defaultValue={editing?.code} placeholder="e.g. SUMMER10"
                className={`${input} uppercase font-mono`} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Note to yourself</span>
              <input name="note" defaultValue={editing?.note} placeholder="e.g. For the wedding fair" className={input} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Type</span>
              <select name="kind" defaultValue={editing?.kind || "percent"} className={input}>
                <option value="percent">Percentage off</option>
                <option value="amount">Amount off (£)</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Amount</span>
              <input name="value" required inputMode="decimal"
                defaultValue={editing ? (editing.kind === "percent" ? editing.value : editing.value / 100) : ""}
                placeholder="e.g. 10 for 10%, or 25 for £25" className={input} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Arrivals from (optional)</span>
              <input type="date" name="validFrom" defaultValue={editing?.validFrom} className={input} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Arrivals up to (optional)</span>
              <input type="date" name="validTo" defaultValue={editing?.validTo} className={input} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Minimum stay (nights)</span>
              <input type="number" name="minNights" min={1} defaultValue={editing?.minNights ?? 1} className={input} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">How many times it can be used</span>
              <input type="number" name="maxUses" min={0} defaultValue={editing?.maxUses ?? 0} className={input} />
              <span className="block text-xs text-ink/50 mt-1">0 means unlimited.</span>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-navy">
            <input type="checkbox" name="active" defaultChecked={editing?.active ?? true} className="w-4 h-4 accent-[var(--navy)]" />
            Code is live
          </label>
          <div className="flex gap-3">
            <button className="bg-navy text-white font-semibold rounded-md px-5 py-2.5 hover:bg-navy/90">
              {editing ? "Save code" : "Create code"}
            </button>
            {editing && <a href="/admin/promo-codes" className="text-sm text-ink/60 self-center underline">Cancel</a>}
          </div>
        </Card>
      </form>
    </div>
  );
}
