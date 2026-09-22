import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { addDays, formatDate, isDate, nightsOf, todayUK, weekday } from "@/lib/booking";
import { addBlockAction, deleteBlockAction } from "@/lib/booking-actions";
import { Card, ErrorBanner, SavedBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

const SPAN = 28;
const input = "border border-black/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy w-full text-sm";

type Cell =
  | { kind: "free" }
  | { kind: "booking"; id: string; label: string; start: boolean; phone: boolean }
  | { kind: "ical"; label: string; start: boolean }
  | { kind: "manual"; id: string; label: string; start: boolean }
  | { kind: "clash"; label: string };

export default async function CalendarPage({ searchParams }:
  { searchParams: Promise<{ from?: string; saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const today = todayUK();
  const from = sp.from && isDate(sp.from) ? sp.from : today;
  const to = addDays(from, SPAN);
  const days = nightsOf(from, to);

  const rooms = await prisma.room.findMany({
    orderBy: { order: "asc" },
    include: {
      units: {
        where: { active: true },
        orderBy: { order: "asc" },
        include: {
          bookings: {
            where: {
              OR: [{ status: "confirmed" }, { status: "pending", expiresAt: { gt: new Date() } }],
              checkIn: { lt: to }, checkOut: { gt: from },
            },
          },
          blocks: { where: { start: { lt: to }, end: { gt: from } } },
        },
      },
    },
  });

  const units = rooms.flatMap((r) => r.units.map((u) => ({ ...u, roomName: r.name })));
  const manualBlocks = units.flatMap((u) => u.blocks.filter((b) => b.source === "manual").map((b) => ({ ...b, unitName: u.name })));
  let clashes = 0;

  const grid = units.map((u) => {
    const cells: Cell[] = days.map((date) => {
      const b = u.bookings.find((x) => x.checkIn <= date && x.checkOut > date);
      const blk = u.blocks.find((x) => x.start <= date && x.end > date);
      const start = (s: string) => s === date || date === from;
      if (b && blk && blk.source === "ical") {
        clashes++;
        return { kind: "clash", label: "Double booked" };
      }
      if (b) return {
        kind: "booking", id: b.id, start: start(b.checkIn), phone: b.source === "phone",
        label: b.status === "pending" ? "Paying..." : b.guestName.split(" ")[0],
      };
      if (blk?.source === "ical") return { kind: "ical", start: start(blk.start), label: blk.summary || "Booked elsewhere" };
      if (blk) return { kind: "manual", id: blk.id, start: start(blk.start), label: blk.summary || "Blocked" };
      return { kind: "free" };
    });
    return { unit: u, cells };
  });

  return (
    <div className="max-w-none">
      <h1 className="font-display text-3xl text-navy mb-1">Calendar</h1>
      <p className="text-ink/60 mb-6">Every room, four weeks at a time. Click a booking to open it.</p>
      <SavedBanner show={sp.saved === "1"} text="Calendar updated." />
      <ErrorBanner message={sp.error} />
      {clashes > 0 && (
        <p className="mb-5 rounded-md bg-red-600 text-white text-sm px-4 py-3">
          {clashes} night{clashes === 1 ? " is" : "s are"} booked both here and on another platform. Open the red nights and move one of the guests.
        </p>
      )}

      <div className="flex items-center gap-2 mb-3 text-sm">
        <Link href={`/admin/calendar?from=${addDays(from, -14)}`} className="px-3 py-1.5 rounded-md border border-black/15 hover:bg-white">&larr; 2 weeks</Link>
        <Link href="/admin/calendar" className="px-3 py-1.5 rounded-md border border-black/15 hover:bg-white">Today</Link>
        <Link href={`/admin/calendar?from=${addDays(from, 14)}`} className="px-3 py-1.5 rounded-md border border-black/15 hover:bg-white">2 weeks &rarr;</Link>
        <span className="text-ink/50 ml-2">
          {formatDate(from, { day: "numeric", month: "short" })} to {formatDate(addDays(to, -1), { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>

      {units.length === 0 ? (
        <p className="text-sm bg-white rounded-xl border border-black/10 p-6 text-ink/60">
          Set how many of each room you have under <a href="/admin/rates" className="underline">Rates &amp; Discounts</a> to see the calendar.
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-black/10 overflow-x-auto">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white text-left px-3 py-2 min-w-[140px] border-b border-black/10">Room</th>
                {days.map((d) => {
                  const wk = weekday(d);
                  return (
                    <th key={d} className={`px-0 py-2 w-9 min-w-9 text-center font-normal border-b border-black/10
                      ${d === today ? "bg-gold/20" : wk === 0 || wk === 6 ? "bg-cream/60" : ""}`}>
                      <span className="block text-[10px] text-ink/40">{formatDate(d, { weekday: "narrow" })}</span>
                      <span className="block font-semibold text-navy">{Number(d.slice(8))}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {grid.map(({ unit, cells }, i) => {
                const newRoom = i === 0 || grid[i - 1].unit.roomId !== unit.roomId;
                return (
                  <tr key={unit.id} className={newRoom && i > 0 ? "border-t-2 border-black/10" : ""}>
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 whitespace-nowrap border-b border-black/5">
                      <span className="font-medium text-navy">{unit.name}</span>
                    </td>
                    {cells.map((c, j) => (
                      <td key={j} className="p-0 h-9 border-b border-black/5 border-l border-l-black/[0.03]">
                        <CellView cell={c} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-xs text-ink/60">
        <Key cls="bg-navy" label="Website booking" />
        <Key cls="bg-navy/60" label="Phone booking" />
        <Key cls="bg-gold" label="Booked on another platform" />
        <Key cls="bg-ink/30" label="Blocked by you" />
        <Key cls="bg-red-600" label="Double booked" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-8">
        <form action={addBlockAction}>
          <input type="hidden" name="from" value={from} />
          <Card title="Block dates">
            <p className="text-sm text-ink/60 -mt-2">Take a room off sale, e.g. for decorating or a staff stay.</p>
            <select name="unitId" required className={input}>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm"><span className="block text-ink/60 mb-1">First night</span><input type="date" name="start" required className={input} /></label>
              <label className="text-sm"><span className="block text-ink/60 mb-1">Free again from</span><input type="date" name="end" required className={input} /></label>
            </div>
            <input name="summary" placeholder="Reason (only you see this)" className={input} />
            <button className="bg-navy text-white font-semibold rounded-md px-5 py-2.5 hover:bg-navy/90">Block</button>
          </Card>
        </form>

        <Card title="Your blocks in this view">
          {manualBlocks.length === 0 && <p className="text-sm text-ink/50">None.</p>}
          <ul className="divide-y divide-black/5 text-sm">
            {manualBlocks.map((b) => (
              <li key={b.id} className="py-2 flex items-center justify-between gap-3">
                <span>
                  <span className="text-navy font-medium">{b.unitName}</span>{" "}
                  <span className="text-ink/60">
                    {formatDate(b.start, { day: "numeric", month: "short" })} to {formatDate(b.end, { day: "numeric", month: "short" })}
                    {b.summary ? ` · ${b.summary}` : ""}
                  </span>
                </span>
                <form action={deleteBlockAction}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="from" value={from} />
                  <button className="text-xs text-accent hover:underline">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function CellView({ cell }: { cell: Cell }) {
  if (cell.kind === "free") return null;
  const base = "block h-7 my-1 text-[10px] leading-7 px-1 overflow-hidden whitespace-nowrap";
  if (cell.kind === "booking") {
    return (
      <Link href={`/admin/bookings/${cell.id}`} title={cell.label}
        className={`${base} ${cell.phone ? "bg-navy/60" : "bg-navy"} text-white ${cell.start ? "rounded-l-md ml-0.5" : ""}`}>
        {cell.start ? cell.label : ""}
      </Link>
    );
  }
  if (cell.kind === "ical") {
    return <span title={cell.label} className={`${base} bg-gold text-navy ${cell.start ? "rounded-l-md ml-0.5" : ""}`}>{cell.start ? "Other" : ""}</span>;
  }
  if (cell.kind === "manual") {
    return <span title={cell.label} className={`${base} bg-ink/30 text-white ${cell.start ? "rounded-l-md ml-0.5" : ""}`}>{cell.start ? cell.label : ""}</span>;
  }
  return <span title={cell.label} className={`${base} bg-red-600 text-white text-center`}>!</span>;
}

function Key({ cls, label }: { cls: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`w-4 h-3 rounded-sm ${cls}`} />{label}</span>;
}
