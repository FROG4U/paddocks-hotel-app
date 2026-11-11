import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/booking";
import { Card } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const [optedIn, total] = await Promise.all([
    prisma.booking.findMany({
      where: { marketingOptIn: true, guestEmail: { not: "" }, status: { in: ["confirmed", "awaiting_approval"] } },
      orderBy: { createdAt: "desc" },
      select: { guestName: true, guestEmail: true, guestPhone: true, createdAt: true, checkIn: true },
    }),
    prisma.booking.count({ where: { status: { in: ["confirmed", "awaiting_approval"] } } }),
  ]);

  // One line per person, keeping their most recent stay.
  const seen = new Map<string, typeof optedIn[number]>();
  for (const b of optedIn) {
    const key = b.guestEmail.toLowerCase();
    if (!seen.has(key)) seen.set(key, b);
  }
  const people = [...seen.values()];
  const csv = "Name,Email,Phone,Opted in,Last stay\n" + people
    .map((p) => [p.guestName, p.guestEmail, p.guestPhone, p.createdAt.toISOString().slice(0, 10), p.checkIn]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return (
    <div>
      <h1 className="font-display text-3xl text-navy mb-1">Marketing List</h1>
      <p className="text-ink/60 mb-6">
        Guests who ticked the box to hear about offers when they booked. Only people who chose to
        be here are listed.
      </p>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Stat n={String(people.length)} label="people have opted in" />
        <Stat n={total ? `${Math.round((people.length / total) * 100)}%` : "-"} label="of guests opt in" />
        <div className="bg-white rounded-xl border border-black/10 p-5">
          <p className="text-sm font-medium text-navy mb-2">Export</p>
          <a download="paddocks-marketing-list.csv"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
            className={`text-sm underline ${people.length ? "text-navy" : "pointer-events-none text-ink/30"}`}>
            Download as a spreadsheet
          </a>
          <p className="text-xs text-ink/50 mt-1">Opens in Excel. Ready for Mailchimp and the like.</p>
        </div>
      </div>

      {people.length === 0 ? (
        <p className="text-sm text-ink/50 bg-white rounded-xl border border-black/10 p-6">
          Nobody yet. Guests appear here as soon as they book and tick the box.
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-black/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream/60 text-left text-xs uppercase text-ink/60">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Opted in</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.guestEmail} className="border-t border-black/5">
                  <td className="px-4 py-2.5 text-navy font-medium">{p.guestName}</td>
                  <td className="px-4 py-2.5"><a href={`mailto:${p.guestEmail}`} className="underline">{p.guestEmail}</a></td>
                  <td className="px-4 py-2.5 text-ink/60">{p.guestPhone || "-"}</td>
                  <td className="px-4 py-2.5 text-ink/60">{formatDate(p.createdAt.toISOString().slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Card title="Using this list properly">
        <ul className="text-sm text-ink/70 list-disc pl-5 space-y-1">
          <li>Only email the people on this list. Guests who did not tick the box are not here, and must not be added.</li>
          <li>Every marketing email needs a way to unsubscribe. Mailchimp and similar add one for you.</li>
          <li>If someone asks to come off, remove them at the source by deleting the booking, or keep your own suppression list in whichever tool you send from.</li>
        </ul>
      </Card>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="bg-white rounded-xl border border-black/10 p-5">
      <p className="text-3xl font-display text-navy">{n}</p>
      <p className="text-sm text-ink/60 mt-1">{label}</p>
    </div>
  );
}
