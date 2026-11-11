import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveRoomAction, deleteRoomAction } from "@/lib/actions";
import { addRoomImageAction, deleteRoomImageAction } from "@/lib/booking-actions";
import Image from "next/image";
import { Text, TextArea, ImageField, Toggle, SaveBar, Card, ErrorBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

export default async function EditRoom({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const room = isNew ? null : await prisma.room.findUnique({
    where: { id },
    include: { images: { orderBy: { order: "asc" } } },
  });
  if (!isNew && !room) notFound();

  return (
    <div>
      <Link href="/admin/rooms" className="text-sm text-ink/50 hover:text-navy">← All rooms</Link>
      <h1 className="font-display text-3xl text-navy mt-2 mb-6">{isNew ? "Add a room" : room!.name}</h1>

      <ErrorBanner message={error} />

      <form action={saveRoomAction}>
        <input type="hidden" name="id" value={isNew ? "new" : room!.id} />

        <Card title="Room details">
          <Text label="Room name" name="name" defaultValue={room?.name} required />
          <Text label="Web address (slug)" name="slug" defaultValue={room?.slug}
            hint="Leave blank to auto-generate from the name. e.g. king-room" />
          <Text label="Order in menu (0 = first)" name="order" defaultValue={String(room?.order ?? 0)} />
          <Text label="Small text above title" name="heroEyebrow" defaultValue={room?.heroEyebrow ?? "Book Our"} />
          <Text label="Beds" name="bedType" defaultValue={room?.bedType}
            hint="e.g. 1 double bed, or 2 single beds. Shown to guests when they book." />
          <ImageField label="Room photo" name="heroImageFile" current={room?.heroImage} />
        </Card>

        <Card title="Description & price">
          <TextArea label="Description" name="description" defaultValue={room?.description} rows={5} />
          <Text label="Price" name="price" defaultValue={room?.price} placeholder="e.g. From £95 / night" />
          <Toggle label="Show the price on the website" name="showPrice" defaultChecked={room?.showPrice ?? false} />
        </Card>

        <Card title="Booking terms for this room">
          <TextArea label="Terms for this room only" name="termsText" defaultValue={room?.termsText} rows={5}
            hint="Leave blank to use the hotel wide terms from Booking Rules. Fill it in only when this room needs different terms." />
        </Card>

        <Card title="SEO">
          <Text label="Browser tab title" name="metaTitle" defaultValue={room?.metaTitle} />
          <TextArea label="Search description" name="metaDescription" defaultValue={room?.metaDescription} rows={2}
            hint="The grey text under your link in Google. Aim for 140-160 characters." />
          <TextArea label="Keywords for this room" name="keywords" defaultValue={room?.keywords} rows={2}
            hint="Comma separated. Added to the site-wide keywords." />
        </Card>

        <SaveBar label={isNew ? "Create room" : "Save room"} />
      </form>

      {!isNew && (
        <Card title="More photos">
          <p className="text-sm text-ink/60 -mt-2">
            Extra pictures shown as a gallery on the room&rsquo;s page, under the main photo. Optional.
          </p>
          {room!.images.length > 0 && (
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {room!.images.map((img) => (
                <li key={img.id} className="relative group">
                  <div className="relative aspect-[4/3] rounded-md overflow-hidden bg-cream">
                    <Image src={img.url} alt={img.caption} fill className="object-cover" sizes="200px" />
                  </div>
                  {img.caption && <p className="text-xs text-ink/60 mt-1">{img.caption}</p>}
                  <form action={deleteRoomImageAction}>
                    <input type="hidden" name="id" value={img.id} />
                    <button className="text-xs text-accent hover:underline mt-0.5">Remove</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={addRoomImageAction} className="space-y-3 border-t border-black/10 pt-4">
            <input type="hidden" name="roomId" value={room!.id} />
            <ImageField label="Add a photo" name="imageFile" />
            <Text label="Caption (optional)" name="caption" />
            <button className="bg-gold text-navy font-semibold rounded-md px-4 py-2 text-sm hover:brightness-95">
              Add photo
            </button>
          </form>
        </Card>
      )}

      {!isNew && (
        <form action={deleteRoomAction} className="mt-4">
          <input type="hidden" name="id" value={room!.id} />
          <button className="text-sm text-accent hover:underline">Delete this room</button>
        </form>
      )}
    </div>
  );
}
