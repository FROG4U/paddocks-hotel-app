import { prisma } from "@/lib/prisma";
import { money } from "@/lib/booking";
import { saveMealPlanAction, deleteMealPlanAction } from "@/lib/booking-actions";
import { Card, ErrorBanner, SavedBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

const input = "border border-black/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy w-full";
const pounds = (p: number) => (p ? (p / 100).toString() : "");

export default async function MealPlansPage({ searchParams }:
  { searchParams: Promise<{ saved?: string; error?: string; edit?: string }> }) {
  const { saved, error, edit } = await searchParams;
  const plans = await prisma.mealPlan.findMany({ orderBy: { order: "asc" } });
  const editing = plans.find((p) => p.id === edit);

  return (
    <div>
      <h1 className="font-display text-3xl text-navy mb-1">Meal Plans &amp; Offers</h1>
      <p className="text-ink/60 mb-6">
        Packages guests can add when they book, such as Bed &amp; Breakfast or Dinner, Bed &amp; Breakfast.
        Priced per person, per night. &ldquo;Room only&rdquo; is always offered as well.
      </p>
      <SavedBanner show={saved === "1"} text="Saved - live on the booking page now." />
      <ErrorBanner message={error} />

      <Card title="Your meal plans">
        {plans.length === 0 && <p className="text-sm text-ink/50">None yet. Add your first one below.</p>}
        <ul className="divide-y divide-black/5">
          {plans.map((p) => (
            <li key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-navy">{p.name} {!p.active && <span className="text-xs text-ink/40">(hidden)</span>}</p>
                <p className="text-xs text-ink/60">
                  {[p.breakfast && "Breakfast", p.lunch && "Lunch", p.dinner && "Dinner"].filter(Boolean).join(" + ") || "No meals ticked"}
                  {" · "}{money(p.pricePerPerson)} per adult a night
                  {p.childPrice ? ` · ${money(p.childPrice)} per child` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a href={`/admin/meal-plans?edit=${p.id}#plan-form`} className="text-xs text-ink/60 underline">Edit</a>
                <form action={deleteMealPlanAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="text-xs text-accent hover:underline">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <form action={saveMealPlanAction} id="plan-form">
        <input type="hidden" name="id" value={editing?.id || ""} />
        <Card title={editing ? `Edit "${editing.name}"` : "Add a meal plan"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="block font-medium text-navy mb-1">Name</span>
              <input name="name" required defaultValue={editing?.name} placeholder="e.g. Dinner, Bed & Breakfast" className={input} />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="block font-medium text-navy mb-1">What is included (shown to guests)</span>
              <input name="description" defaultValue={editing?.description}
                placeholder="e.g. Full English breakfast and a three-course dinner in our restaurant" className={input} />
            </label>
            <div className="text-sm sm:col-span-2">
              <span className="block font-medium text-navy mb-1">Meals</span>
              <div className="flex gap-5">
                {(["breakfast", "lunch", "dinner"] as const).map((m) => (
                  <label key={m} className="flex items-center gap-1.5 capitalize">
                    <input type="checkbox" name={m} defaultChecked={editing ? editing[m] : m === "breakfast"} className="w-4 h-4 accent-[var(--navy)]" />{m}
                  </label>
                ))}
              </div>
            </div>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Price per adult, per night (£)</span>
              <input name="pricePerPerson" inputMode="decimal" defaultValue={pounds(editing?.pricePerPerson || 0)} placeholder="e.g. 12.50" className={input} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Price per child, per night (£)</span>
              <input name="childPrice" inputMode="decimal" defaultValue={pounds(editing?.childPrice || 0)} placeholder="Leave blank if free" className={input} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-navy mb-1">Order on the page</span>
              <input type="number" name="order" defaultValue={editing?.order ?? plans.length} className={input} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-navy">
            <input type="checkbox" name="active" defaultChecked={editing?.active ?? true} className="w-4 h-4 accent-[var(--navy)]" />
            Offer this on the booking page
          </label>
          <div className="flex gap-3">
            <button className="bg-navy text-white font-semibold rounded-md px-5 py-2.5 hover:bg-navy/90">
              {editing ? "Save meal plan" : "Add meal plan"}
            </button>
            {editing && <a href="/admin/meal-plans" className="text-sm text-ink/60 self-center underline">Cancel</a>}
          </div>
        </Card>
      </form>
    </div>
  );
}
