"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Room = {
  slug: string; name: string; image: string; maxGuests: number;
  basePrice: number; shortDesc: string; bedType: string;
};
type MealPlan = {
  id: string; name: string; description: string;
  breakfast: boolean; lunch: boolean; dinner: boolean;
  pricePerPerson: number; childPrice: number;
};
type Day = { date: string; free: number; total: number; price: number; base: number; rule: string };
type Quote = {
  ok: boolean; error?: string; promoError?: string; nights: number;
  breakdown: { date: string; price: number; base: number; rule: string }[];
  roomTotal: number; mealPlanName: string; mealTotal: number;
  promoCode: string; promoDiscount: number; total: number; available: number;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const money = (p: number) => {
  const v = p / 100;
  return "£" + (Number.isInteger(v) ? v.toLocaleString("en-GB")
    : v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
};
const todayUK = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
const addDays = (d: string, n: number) => {
  const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10);
};
const monthStart = (d: string) => d.slice(0, 8) + "01";
const addMonths = (first: string, n: number) => {
  const x = new Date(first + "T00:00:00Z"); x.setUTCMonth(x.getUTCMonth() + n); return x.toISOString().slice(0, 10);
};
const nice = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });

type Offer = { id: string; name: string; badge: string; description: string; image: string; roomSlug: string | null };

export default function BookingWidget({
  rooms, mealPlans, offers, initialRoom, phone, paymentsOn, cancelled,
  checkInTime, checkOutTime, terms, roomTerms, marketingText, requireApproval,
}: {
  rooms: Room[]; mealPlans: MealPlan[]; offers: Offer[]; initialRoom: string; phone: string;
  paymentsOn: boolean; cancelled: boolean;
  checkInTime: string; checkOutTime: string;
  terms: string; roomTerms: Record<string, string>; marketingText: string; requireApproval: boolean;
}) {
  const today = useMemo(() => todayUK(), []);
  const [roomSlug, setRoomSlug] = useState(initialRoom || rooms[0]?.slug || "");
  const room = rooms.find((r) => r.slug === roomSlug);

  const [viewMonth, setViewMonth] = useState(monthStart(today));
  const [days, setDays] = useState<Record<string, Day>>({});
  const [loading, setLoading] = useState(false);

  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [mealPlanId, setMealPlanId] = useState<string>("");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState("");

  const [q, setQ] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);

  const [guest, setGuest] = useState({ name: "", email: "", phone: "", notes: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // Keep guests within the room's limit.
  useEffect(() => {
    if (!room) return;
    if (adults > room.maxGuests) setAdults(room.maxGuests);
    if (adults + children > room.maxGuests) setChildren(Math.max(0, room.maxGuests - adults));
  }, [room, adults, children]);

  // Load availability for the two months on screen (plus a week, so a stay
  // that ends early next month can still be checked).
  const load = useCallback(async () => {
    if (!roomSlug) return;
    setLoading(true);
    const from = viewMonth < monthStart(today) ? today : viewMonth;
    const to = addDays(addMonths(viewMonth, 2), 8);
    try {
      const res = await fetch(`/api/booking/availability?room=${roomSlug}&from=${from}&to=${to}`);
      const data = await res.json();
      if (Array.isArray(data.days)) {
        setDays((prev) => {
          const next = { ...prev };
          for (const d of data.days as Day[]) next[d.date] = d;
          return next;
        });
      }
    } finally {
      setLoading(false);
    }
  }, [roomSlug, viewMonth, today]);
  useEffect(() => { load(); }, [load]);

  // A new room: forget the old room's calendar and selection.
  function pickRoom(slug: string) {
    if (slug === roomSlug) return;
    setRoomSlug(slug); setDays({}); setCheckIn(null); setCheckOut(null); setQ(null);
  }

  const isFree = (d: string) => (days[d]?.free ?? 0) > 0;

  /** The latest checkout allowed after a check-in: the first night that is full. */
  const maxCheckout = useMemo(() => {
    if (!checkIn) return null;
    let d = addDays(checkIn, 1);
    for (let i = 0; i < 30; i++) {
      if (!days[d] || !isFree(d)) return d;
      d = addDays(d, 1);
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn, days]);

  function clickDay(d: string) {
    setError("");
    if (!checkIn || checkOut) {
      if (d < today || !isFree(d)) return;
      setCheckIn(d); setCheckOut(null); return;
    }
    if (d <= checkIn) {
      if (d >= today && isFree(d)) { setCheckIn(d); setCheckOut(null); }
      return;
    }
    if (maxCheckout && d > maxCheckout) {
      if (isFree(d)) { setCheckIn(d); setCheckOut(null); }
      return;
    }
    setCheckOut(d);
  }

  // Price the stay whenever the choices change.
  useEffect(() => {
    if (!checkIn || !checkOut || !roomSlug) { setQ(null); return; }
    let stale = false;
    setQuoting(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/booking/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomSlug, checkIn, checkOut, adults, children, mealPlanId, promoCode: promo }),
        });
        const data = await res.json();
        if (!stale) setQ(data);
      } finally {
        if (!stale) setQuoting(false);
      }
    }, 200);
    return () => { stale = true; clearTimeout(t); };
  }, [roomSlug, checkIn, checkOut, adults, children, mealPlanId, promo]);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!q?.ok || !checkIn || !checkOut) return;
    setPaying(true); setError("");
    try {
      const res = await fetch("/api/booking/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: roomSlug, checkIn, checkOut, adults, children, mealPlanId,
          promoCode: q.promoCode || promo,
          guestName: guest.name, guestEmail: guest.email, guestPhone: guest.phone, notes: guest.notes,
          acceptedTerms, marketingOptIn,
        }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      setError(data.error || "Something went wrong. Please try again.");
      if (/just been booked/i.test(data.error || "")) { setCheckIn(null); setCheckOut(null); load(); }
    } catch {
      setError(`We could not reach the booking system. Please try again or call ${phone}.`);
    }
    setPaying(false);
  }

  if (!rooms.length) {
    return (
      <div className="bg-cream rounded-lg p-10 text-center">
        <p className="text-lg text-ink/80">Online booking is not open just yet. Please call us on{" "}
          <a href={`tel:${phone.replace(/\s/g, "")}`} className="underline text-navy">{phone}</a> and we will look after you.</p>
      </div>
    );
  }

  const months = [viewMonth, addMonths(viewMonth, 1)];
  const canGoBack = viewMonth > monthStart(today);
  const rangeEnd = checkOut || (checkIn && hover && hover > checkIn && (!maxCheckout || hover <= maxCheckout) ? hover : null);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] items-start">
      <div>
        {cancelled && (
          <p className="mb-6 rounded-sm bg-cream border border-gold/40 px-4 py-3 text-sm text-ink/80">
            No problem, your payment was cancelled and nothing was charged. Your dates are still shown below.
          </p>
        )}

        {offers.length > 0 && (
          <div className="mb-10">
            <h2 className="caption-title mb-3">Our current offers</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((o) => (
                <button key={o.id} type="button"
                  onClick={() => { if (o.roomSlug) pickRoom(o.roomSlug); }}
                  className={`text-left rounded-lg overflow-hidden border border-gold/50 bg-cream/40 ${o.roomSlug ? "hover:border-gold" : "cursor-default"}`}>
                  {o.image && (
                    <div className="relative aspect-[16/9]">
                      <Image src={o.image} alt={o.name} fill className="object-cover" sizes="(max-width:640px) 100vw, 320px" />
                    </div>
                  )}
                  <div className="px-4 py-3">
                    {o.badge && <span className="inline-block text-[10px] font-bold uppercase bg-gold text-navy rounded px-2 py-0.5 mb-1.5">{o.badge}</span>}
                    <p className="font-display text-navy uppercase text-sm">{o.name}</p>
                    {o.description && <p className="text-xs text-ink/70 mt-1 leading-relaxed">{o.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1. Room */}
        <h2 className="caption-title mb-3">1. Choose your room</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mb-10">
          {rooms.map((r) => (
            <button key={r.slug} type="button" onClick={() => pickRoom(r.slug)}
              className={`text-left rounded-lg overflow-hidden border-2 transition bg-white
                flex sm:block items-center ${
                r.slug === roomSlug ? "border-navy shadow-md" : "border-black/10 hover:border-gold"}`}>
              {/* A small thumbnail on phones, a full photo on wider screens */}
              <div className="relative w-24 h-20 flex-none sm:w-auto sm:h-auto sm:aspect-[16/10] bg-cream">
                {r.image && <Image src={r.image} alt={r.name} fill className="object-cover" sizes="(max-width:640px) 96px, 300px" />}
              </div>
              <div className="px-4 py-3">
                <p className="font-display text-navy uppercase">{r.name}</p>
                <p className="text-sm text-ink/60">
                  From {money(r.basePrice)} a night · sleeps {r.maxGuests}
                  {r.bedType ? ` · ${r.bedType}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* 2. Dates */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="caption-title">2. Choose your dates</h2>
          <div className="flex items-center gap-2">
            <button type="button" disabled={!canGoBack} onClick={() => setViewMonth(addMonths(viewMonth, -1))}
              aria-label="Previous month"
              className="w-9 h-9 rounded-full border border-black/15 grid place-items-center disabled:opacity-30 hover:bg-cream">‹</button>
            <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))} aria-label="Next month"
              disabled={viewMonth >= addMonths(monthStart(today), 16)}
              className="w-9 h-9 rounded-full border border-black/15 grid place-items-center disabled:opacity-30 hover:bg-cream">›</button>
          </div>
        </div>

        <div className={`grid gap-8 md:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
          {months.map((m, idx) => (
            <Month key={m} first={m} hideOnMobile={idx === 1} today={today} days={days}
              checkIn={checkIn} rangeEnd={rangeEnd} maxCheckout={maxCheckout}
              onClick={clickDay} onHover={setHover} />
          ))}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-xs text-ink/60">
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-navy inline-block" /> Your stay</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-gold/25 inline-block" /> Nights included</span>
          <span className="flex items-center gap-2"><span className="line-through">14</span> Fully booked</span>
          <span className="flex items-center gap-2"><span className="text-green-700 font-semibold">£</span> Discounted night</span>
        </div>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-44 bg-white rounded-lg shadow-lg border border-black/5 overflow-hidden">
        <div className="bg-navy text-white px-6 py-5">
          <p className="font-display text-xl uppercase">{room?.name || "Your stay"}</p>
          <p className="text-sm text-white/70 mt-1">
            {checkIn ? nice(checkIn) : "Arrival"} → {checkOut ? nice(checkOut) : "Departure"}
            {q?.nights ? ` · ${q.nights} night${q.nights === 1 ? "" : "s"}` : ""}
          </p>
          <p className="text-xs text-white/50 mt-1.5">
            Check in from {checkInTime} · check out by {checkOutTime}
          </p>
        </div>

        <form onSubmit={pay} className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Counter label="Adults" value={adults} min={1} max={room?.maxGuests || 2}
              onChange={(v) => setAdults(v)} />
            <Counter label="Children" value={children} min={0} max={Math.max(0, (room?.maxGuests || 2) - adults)}
              onChange={(v) => setChildren(v)} />
          </div>

          {mealPlans.length > 0 && (
            <div>
              <p className="text-sm font-medium text-navy mb-2">Meals</p>
              <div className="space-y-2">
                <MealOption checked={!mealPlanId} onPick={() => setMealPlanId("")}
                  name="Room only" detail="No meals included" price="" />
                {mealPlans.map((m) => (
                  <MealOption key={m.id} checked={mealPlanId === m.id} onPick={() => setMealPlanId(m.id)}
                    name={m.name}
                    detail={m.description || [m.breakfast && "Breakfast", m.lunch && "Lunch", m.dinner && "Dinner"].filter(Boolean).join(", ")}
                    price={`+${money(m.pricePerPerson)} per adult a night${m.childPrice ? `, ${money(m.childPrice)} per child` : ""}`} />
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-navy mb-2">Discount code</p>
            <div className="flex gap-2">
              <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER10"
                className="flex-1 border border-black/15 rounded-sm px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-navy" />
              <button type="button" onClick={() => setPromo(promoInput.trim())}
                className="border border-navy text-navy text-sm font-semibold rounded-sm px-4 hover:bg-navy hover:text-white">
                Apply
              </button>
            </div>
            {promo && q?.promoError && <p className="text-xs text-red-700 mt-1">{q.promoError}</p>}
            {q?.promoCode && <p className="text-xs text-green-700 mt-1">{q.promoCode} applied.</p>}
          </div>

          {/* Price */}
          <div className="border-t border-black/10 pt-4 text-sm space-y-1.5">
            {!checkIn && <p className="text-ink/60">Pick an arrival date on the calendar.</p>}
            {checkIn && !checkOut && <p className="text-ink/60">Now pick your departure date.</p>}
            {q && !q.ok && q.error && <p className="text-red-700">{q.error}</p>}
            {q?.ok && (
              <>
                <Line label={`${q.nights} night${q.nights === 1 ? "" : "s"}`} value={money(q.breakdown.reduce((s, n) => s + n.base, 0))} />
                {q.breakdown.some((n) => n.price < n.base) && (
                  <Line label={q.breakdown.find((n) => n.rule)?.rule || "Date discount"}
                    value={`-${money(q.breakdown.reduce((s, n) => s + n.base - n.price, 0))}`} good />
                )}
                {q.mealTotal > 0 && <Line label={q.mealPlanName} value={money(q.mealTotal)} />}
                {q.promoDiscount > 0 && <Line label={`Code ${q.promoCode}`} value={`-${money(q.promoDiscount)}`} good />}
                <div className="flex justify-between items-baseline pt-2 border-t border-black/10 mt-2">
                  <span className="font-semibold text-navy">Total</span>
                  <span className="font-display text-2xl text-navy">{money(q.total)}</span>
                </div>
              </>
            )}
            {quoting && <p className="text-xs text-ink/40">Updating price...</p>}
          </div>

          {q?.ok && (
            <div className="space-y-3 border-t border-black/10 pt-4">
              <p className="text-sm font-medium text-navy">Your details</p>
              <input required placeholder="Full name" value={guest.name} autoComplete="name"
                onChange={(e) => setGuest({ ...guest, name: e.target.value })} className={field} />
              <input required type="email" placeholder="Email" value={guest.email} autoComplete="email"
                onChange={(e) => setGuest({ ...guest, email: e.target.value })} className={field} />
              <input placeholder="Phone (optional)" value={guest.phone} autoComplete="tel"
                onChange={(e) => setGuest({ ...guest, phone: e.target.value })} className={field} />
              <textarea placeholder="Anything we should know? (optional)" rows={2} value={guest.notes}
                onChange={(e) => setGuest({ ...guest, notes: e.target.value })} className={field} />

              <div className="space-y-2.5 border-t border-black/10 pt-3">
                <label className="flex items-start gap-2 text-xs text-ink/70">
                  <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-[var(--navy)] flex-none" />
                  <span>
                    I accept the{" "}
                    <button type="button" onClick={() => setShowTerms(true)} className="underline text-navy">
                      booking terms
                    </button>.
                  </span>
                </label>
                {marketingText && (
                  <label className="flex items-start gap-2 text-xs text-ink/70">
                    <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-[var(--navy)] flex-none" />
                    <span>{marketingText}</span>
                  </label>
                )}
              </div>

              {error && <p className="text-sm text-red-700">{error}</p>}

              {paymentsOn ? (
                <button type="submit" disabled={paying || !acceptedTerms}
                  className="btn-brand w-full text-center disabled:opacity-50">
                  {paying ? "Taking you to payment..."
                    : requireApproval ? `Request this stay - ${money(q.total)}`
                    : `Pay ${money(q.total)} securely`}
                </button>
              ) : (
                <p className="text-sm bg-cream rounded-sm px-4 py-3 text-ink/80">
                  Online payment is not switched on yet. Please call{" "}
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className="underline">{phone}</a> to book these dates.
                </p>
              )}
              <p className="text-[11px] text-ink/50 text-center">
                {requireApproval
                  ? "Your card is checked and held, but nothing is taken until we confirm your booking. Handled by Stripe; your card details never touch our website."
                  : "Payment is taken in full by Stripe. Your card details never touch our website."}
              </p>
            </div>
          )}
        </form>
      </aside>

      {showTerms && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowTerms(false)}>
          <div className="bg-white rounded-lg max-w-xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="bg-navy text-white px-6 py-4 flex items-center justify-between sticky top-0">
              <p className="font-display text-lg">Booking terms</p>
              <button type="button" onClick={() => setShowTerms(false)} aria-label="Close" className="text-white/70 hover:text-white text-xl">&times;</button>
            </div>
            <div className="px-6 py-5 text-sm text-ink/80 space-y-3 leading-relaxed">
              <p>Check in from {checkInTime}. Check out by {checkOutTime}.</p>
              {((roomSlug && roomTerms[roomSlug]) || terms)
                .split("\n").filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}
              {!terms && !(roomSlug && roomTerms[roomSlug]) && (
                <p className="text-ink/50">
                  Please call us on {phone} if you have any questions about your booking.
                </p>
              )}
            </div>
            <div className="px-6 pb-5">
              <button type="button"
                onClick={() => { setAcceptedTerms(true); setShowTerms(false); }}
                className="btn-brand w-full text-center">
                I accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const field = "w-full border border-black/15 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy";

function Month({ first, today, days, checkIn, rangeEnd, maxCheckout, onClick, onHover, hideOnMobile }: {
  first: string; today: string; days: Record<string, Day>;
  checkIn: string | null; rangeEnd: string | null; maxCheckout: string | null;
  onClick: (d: string) => void; onHover: (d: string | null) => void; hideOnMobile: boolean;
}) {
  const lead = (new Date(first + "T00:00:00Z").getUTCDay() + 6) % 7; // Monday first
  const next = (() => { const x = new Date(first + "T00:00:00Z"); x.setUTCMonth(x.getUTCMonth() + 1); return x.toISOString().slice(0, 10); })();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = first; d < next; d = addDays(d, 1)) cells.push(d);

  return (
    <div className={hideOnMobile ? "hidden md:block" : ""}>
      <p className="text-center font-semibold text-navy mb-3">
        {nice(first, { month: "long", year: "numeric" })}
      </p>
      <div className="grid grid-cols-7 text-center text-[11px] uppercase text-ink/40 mb-1">
        {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => onHover(null)}>
        {cells.map((d, i) => {
          if (!d) return <span key={`b${i}`} />;
          const info = days[d];
          const past = d < today;
          const full = !past && info !== undefined && info.free <= 0;
          const isStart = d === checkIn;
          const isEnd = d === rangeEnd;
          const inRange = !!(checkIn && rangeEnd && d > checkIn && d < rangeEnd);
          // A full night can still be chosen as the morning you leave.
          const checkoutOnly = !!(checkIn && !rangeEnd && full && maxCheckout === d);
          const disabled = past || (!info && !past) || (full && !checkoutOnly);
          const discounted = info && info.price < info.base;

          return (
            <button key={d} type="button" disabled={disabled}
              onClick={() => onClick(d)} onMouseEnter={() => onHover(d)}
              className={`relative h-14 flex flex-col items-center justify-center text-sm transition
                ${inRange ? "bg-gold/25" : ""}
                ${isStart ? "rounded-l-full" : ""} ${isEnd ? "rounded-r-full" : ""}
                ${disabled ? "cursor-default" : "cursor-pointer"}`}>
              <span className={`w-11 h-11 rounded-full flex flex-col items-center justify-center leading-none
                ${isStart || isEnd ? "bg-navy text-white" : !disabled ? "hover:ring-2 hover:ring-navy" : ""}
                ${past ? "text-ink/25" : ""} ${full && !checkoutOnly ? "text-ink/30 line-through" : ""}`}>
                <span className="font-medium">{Number(d.slice(8))}</span>
                {info && !past && !full && (
                  <span className={`text-[10px] mt-0.5 ${isStart || isEnd ? "text-white/80"
                    : discounted ? "text-green-700 font-semibold" : "text-ink/50"}`}>
                    £{Math.round(info.price / 100)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Counter({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-navy mb-1">{label}</p>
      <div className="flex items-center border border-black/15 rounded-sm">
        <button type="button" disabled={value <= min} onClick={() => onChange(value - 1)}
          className="w-9 h-9 text-lg disabled:opacity-30">−</button>
        <span className="flex-1 text-center">{value}</span>
        <button type="button" disabled={value >= max} onClick={() => onChange(value + 1)}
          className="w-9 h-9 text-lg disabled:opacity-30">+</button>
      </div>
    </div>
  );
}

function MealOption({ checked, onPick, name, detail, price }: {
  checked: boolean; onPick: () => void; name: string; detail: string; price: string;
}) {
  return (
    <button type="button" onClick={onPick}
      className={`w-full text-left rounded-sm border px-3 py-2.5 transition ${
        checked ? "border-navy bg-navy/5" : "border-black/10 hover:border-gold"}`}>
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-navy">{name}</span>
        <span className={`w-4 h-4 rounded-full border-2 flex-none ${checked ? "border-navy bg-navy" : "border-black/30"}`} />
      </span>
      {detail && <span className="block text-xs text-ink/60 mt-0.5">{detail}</span>}
      {price && <span className="block text-xs text-gold font-semibold mt-0.5">{price}</span>}
    </button>
  );
}

function Line({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className={`flex justify-between ${good ? "text-green-700" : "text-ink/80"}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
