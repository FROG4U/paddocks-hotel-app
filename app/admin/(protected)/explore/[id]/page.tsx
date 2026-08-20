import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveExploreAction, deleteExploreAction } from "@/lib/actions";
import { Text, TextArea, ImageField, Toggle, SaveBar, Card, ErrorBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

export default async function EditExplore({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const item = isNew ? null : await prisma.exploreItem.findUnique({ where: { id } });
  if (!isNew && !item) notFound();

  return (
    <div>
      <Link href="/admin/explore" className="text-sm text-ink/50 hover:text-navy">&larr; All Explore cards</Link>
      <h1 className="font-display text-3xl text-navy mt-2 mb-6">{isNew ? "Add a card" : item!.title}</h1>

      <ErrorBanner message={error} />

      <form action={saveExploreAction}>
        <input type="hidden" name="id" value={isNew ? "new" : item!.id} />

        <Card title="Card content">
          <Text label="Title" name="title" defaultValue={item?.title} required
            hint="Shown in large letters on the card, e.g. Symonds Yat Rock" />
          <TextArea label="Text" name="description" defaultValue={item?.description} rows={4}
            hint="A sentence or two about the place. Keep it short so the cards line up." />
          <ImageField label="Photo" name="imageFile" current={item?.image} />
        </Card>

        <Card title="Button">
          <Text label="Button link (URL)" name="linkUrl" defaultValue={item?.linkUrl}
            placeholder="https://www.example.co.uk"
            hint="The website the button opens, in a new tab. You can paste it with or without https://" />
          <Text label="Button text" name="buttonLabel" defaultValue={item?.buttonLabel ?? "View"}
            hint="Defaults to View" />
        </Card>

        <Card title="Display">
          <Text label="Order on the page (0 = first)" name="order" defaultValue={String(item?.order ?? 0)} />
          <Toggle label="Show this card on the website" name="published" defaultChecked={item?.published ?? true} />
        </Card>

        <SaveBar label={isNew ? "Create card" : "Save card"} />
      </form>

      {!isNew && (
        <form action={deleteExploreAction} className="mt-4">
          <input type="hidden" name="id" value={item!.id} />
          <button className="text-sm text-accent hover:underline">Delete this card</button>
        </form>
      )}
    </div>
  );
}
