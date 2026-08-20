import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveRoomAction, deleteRoomAction } from "@/lib/actions";
import { Text, TextArea, ImageField, Toggle, SaveBar, Card, ErrorBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

export default async function EditRoom({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const room = isNew ? null : await prisma.room.findUnique({ where: { id } });
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
          <ImageField label="Room photo" name="heroImageFile" current={room?.heroImage} />
        </Card>

        <Card title="Description & price">
          <TextArea label="Description" name="description" defaultValue={room?.description} rows={5} />
          <Text label="Price" name="price" defaultValue={room?.price} placeholder="e.g. From £95 / night" />
          <Toggle label="Show the price on the website" name="showPrice" defaultChecked={room?.showPrice ?? false} />
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
        <form action={deleteRoomAction} className="mt-4">
          <input type="hidden" name="id" value={room!.id} />
          <button className="text-sm text-accent hover:underline">Delete this room</button>
        </form>
      )}
    </div>
  );
}
