import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data";
import { saveUnitSyncAction, syncAllNowAction } from "@/lib/booking-actions";
import { Card, ErrorBanner, SavedBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

const input = "border border-black/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy w-full text-sm";

function ago(d: Date | null) {
  if (!d) return "never";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 48 ? `${hrs} hr ago` : `${Math.round(hrs / 24)} days ago`;
}

export default async function ChannelSyncPage({ searchParams }:
  { searchParams: Promise<{ saved?: string; error?: string; synced?: string }> }) {
  const { saved, error, synced } = await searchParams;
  const [s, rooms] = await Promise.all([
    getSettings(),
    prisma.room.findMany({
      orderBy: { order: "asc" },
      include: {
        units: {
          orderBy: { order: "asc" },
          include: { _count: { select: { blocks: { where: { source: "ical" } } } } },
        },
      },
    }),
  ]);
  const base = (s.siteUrl || "https://paddockshotel.com").replace(/\/$/, "");
  const connected = rooms.flatMap((r) => r.units).filter((u) => u.icalImportUrl).length;
  const total = rooms.flatMap((r) => r.units).length;

  return (
    <div>
      <h1 className="font-display text-3xl text-navy mb-1">Channel Sync</h1>
      <p className="text-ink/60 mb-6">
        Keeps this website and your other booking platforms in step, so a room sold in one place cannot be sold again in another.
      </p>
      <SavedBanner show={saved === "1"} text="Saved and synced." />
      <SavedBanner show={!!synced} text={`Synced ${synced} calendar${synced === "1" ? "" : "s"}.`} />
      <ErrorBanner message={error} />

      <Card title="How it works">
        <ol className="text-sm text-ink/70 list-decimal pl-5 space-y-2">
          <li>
            Each physical room below has its own <strong>calendar address</strong> from this website. Copy it into your channel
            manager or booking platform, in its &ldquo;import calendar&rdquo; or &ldquo;iCal sync&rdquo; section, against the matching room.
            It then stops selling nights that are booked here.
          </li>
          <li>
            In the same place, that system gives you <strong>its</strong> calendar address (an &ldquo;export&rdquo; link ending in .ics).
            Paste it into the box for that room here. This website then stops selling nights booked there.
          </li>
          <li>
            This site re-checks the other calendars every 15 minutes, and always just before taking a payment.
            Other systems check ours on their own timetable, usually every 15 to 60 minutes.
          </li>
        </ol>
        <p className="text-xs text-ink/50">
          Works with Booking.com, Airbnb, Vrbo, Expedia (through a channel manager), and channel managers such as
          Beds24, eviivo, FreeToBook, Little Hotelier, Cloudbeds and Lodgify. The addresses only share dates, never guest names.
        </p>
        <form action={syncAllNowAction}>
          <button disabled={!connected}
            className="bg-navy text-white font-semibold rounded-md px-5 py-2.5 hover:bg-navy/90 disabled:opacity-40">
            Sync all now
          </button>
          <span className="text-xs text-ink/50 ml-3">{connected} of {total} rooms connected</span>
        </form>
      </Card>

      {total === 0 && (
        <p className="text-sm bg-white rounded-xl border border-black/10 p-6 text-ink/60">
          No rooms set up yet. Set how many of each room you have under <a href="/admin/rates" className="underline">Rates &amp; Discounts</a> first.
        </p>
      )}

      {rooms.filter((r) => r.units.length).map((room) => (
        <Card key={room.id} title={room.name}>
          <div className="space-y-5">
            {room.units.map((u) => {
              const feed = `${base}/api/ical/${u.exportToken}.ics`;
              return (
                <form key={u.id} action={saveUnitSyncAction} className="rounded-lg border border-black/10 p-4 space-y-3">
                  <input type="hidden" name="id" value={u.id} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <input name="name" defaultValue={u.name} aria-label="Room name"
                      className="font-medium text-navy bg-transparent border-b border-dashed border-black/20 focus:outline-none focus:border-navy" />
                    <span className={`text-xs ${u.lastSyncError ? "text-red-700" : u.icalImportUrl ? "text-green-700" : "text-ink/40"}`}>
                      {u.lastSyncError
                        ? `Problem: ${u.lastSyncError}`
                        : u.icalImportUrl
                          ? `Synced ${ago(u.lastSyncAt)} · ${u._count.blocks} booking${u._count.blocks === 1 ? "" : "s"} from elsewhere`
                          : "Not connected"}
                    </span>
                  </div>

                  <label className="block">
                    <span className="block text-xs font-medium text-ink/60 mb-1">
                      1. This website&rsquo;s calendar - copy into the other system
                    </span>
                    <input readOnly value={feed} className={`${input} font-mono text-xs bg-cream/40`} />
                  </label>

                  <label className="block">
                    <span className="block text-xs font-medium text-ink/60 mb-1">
                      2. The other system&rsquo;s calendar - paste here
                    </span>
                    <input name="icalImportUrl" defaultValue={u.icalImportUrl} placeholder="https://..../calendar.ics"
                      className={`${input} font-mono text-xs`} />
                  </label>

                  <button className="text-sm bg-gold text-navy font-semibold rounded-md px-4 py-2 hover:brightness-95">
                    Save and sync
                  </button>
                </form>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
