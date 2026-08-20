import Link from "next/link";
import Image from "next/image";
import { getAllExploreItems } from "@/lib/data";
import { SavedBanner } from "@/components/admin/fields";
import { relinkPhotosAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function ExploreList({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string; relinked?: string }> }) {
  const { saved, deleted, relinked } = await searchParams;
  const items = await getAllExploreItems();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-navy">Explore</h1>
        <Link href="/admin/explore/new" className="bg-navy text-white text-sm font-semibold rounded-md px-4 py-2 hover:bg-navy/90">
          + Add card
        </Link>
      </div>
      <p className="text-sm text-ink/60 mb-5">
        Cards shown on the Explore page. Each one has a photo, a short description and a button
        that opens another website in a new tab.
      </p>
      <SavedBanner show={saved === "1"} text="Card saved - live now." />
      <SavedBanner show={deleted === "1"} text="Card deleted." />
      {relinked !== undefined && (
        <SavedBanner show text={
          Number(relinked) > 0
            ? Number(relinked) === 1
              ? "Reconnected 1 photo that had lost its link."
              : `Reconnected ${relinked} photos that had lost their links.`
            : "No missing photos found. Everything on the server is already connected."
        } />
      )}

      <form action={relinkPhotosAction} className="mb-5">
        <button className="text-sm text-navy underline hover:no-underline">
          Photos missing? Reconnect them
        </button>
        <span className="block text-xs text-ink/50 mt-1">
          Looks for photos still on the server that a card has lost track of, and puts them back.
        </span>
      </form>

      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id}>
            <Link href={`/admin/explore/${it.id}`}
              className="flex items-center gap-4 bg-white rounded-lg border border-black/10 p-3 hover:border-navy/30 hover:shadow-sm transition">
              <div className="relative w-20 h-14 rounded overflow-hidden bg-cream flex-shrink-0">
                {it.image && <Image src={it.image} alt={it.title} fill className="object-cover" sizes="80px" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-navy">
                  {it.title}
                  {!it.published && <span className="ml-2 text-xs text-ink/40">(hidden)</span>}
                </p>
                <p className="text-xs text-ink/50 truncate">{it.linkUrl || "No link set"}</p>
              </div>
              <span className="text-ink/40 text-sm">Edit &rarr;</span>
            </Link>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <p className="text-sm text-ink/50">No cards yet. Use &ldquo;Add card&rdquo; to create the first one.</p>
      )}
    </div>
  );
}
