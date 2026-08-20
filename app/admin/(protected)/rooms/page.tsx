import Link from "next/link";
import Image from "next/image";
import { getRooms } from "@/lib/data";
import { SavedBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

export default async function RoomsList({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  const { saved, deleted } = await searchParams;
  const rooms = await getRooms();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-navy">Rooms & Prices</h1>
        <Link href="/admin/rooms/new" className="bg-navy text-white text-sm font-semibold rounded-md px-4 py-2 hover:bg-navy/90">
          + Add room
        </Link>
      </div>
      <SavedBanner show={saved === "1"} text="Room saved - live now." />
      <SavedBanner show={deleted === "1"} text="Room deleted." />

      <ul className="space-y-2">
        {rooms.map((r) => (
          <li key={r.id}>
            <Link href={`/admin/rooms/${r.id}`}
              className="flex items-center gap-4 bg-white rounded-lg border border-black/10 p-3 hover:border-navy/30 hover:shadow-sm transition">
              <div className="relative w-20 h-14 rounded overflow-hidden bg-cream flex-shrink-0">
                {r.heroImage && <Image src={r.heroImage} alt={r.name} fill className="object-cover" sizes="80px" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-navy">{r.name}</p>
                <p className="text-xs text-ink/50">{r.showPrice && r.price ? r.price : "No price shown"}</p>
              </div>
              <span className="text-ink/40 text-sm">Edit →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
