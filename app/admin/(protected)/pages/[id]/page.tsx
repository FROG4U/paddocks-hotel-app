import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { savePageAction } from "@/lib/actions";
import { parseSections } from "@/lib/data";
import { Text, TextArea, ImageField, Toggle, SaveBar, SavedBanner, Card } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) notFound();
  const sections = parseSections(page.sectionsJson);

  return (
    <div>
      <Link href="/admin/pages" className="text-sm text-ink/50 hover:text-navy">← All pages</Link>
      <h1 className="font-display text-3xl text-navy mt-2 mb-6">{page.title}</h1>
      <SavedBanner show={saved === "1"} />

      <form action={savePageAction}>
        <input type="hidden" name="id" value={page.id} />
        <input type="hidden" name="sectionCount" value={sections.length} />

        <Card title="Hero (top banner)">
          <Text label="Small text above title (eyebrow)" name="heroEyebrow" defaultValue={page.heroEyebrow} placeholder="e.g. Welcome to" />
          <Text label="Big title" name="heroTitle" defaultValue={page.heroTitle} />
          <Text label="Subtitle" name="heroSubtitle" defaultValue={page.heroSubtitle} />
          <ImageField label="Background photo" name="heroImageFile" current={page.heroImage} />
        </Card>

        {sections.length > 0 && (
          <Card title="Page content">
            {sections.map((sec, i) => (
              <div key={i} className="border border-black/10 rounded-lg p-4 space-y-3 bg-cream/30">
                <p className="text-xs uppercase tracking-wide text-ink/40">Section {i + 1}</p>
                <Text label="Heading" name={`section_${i}_heading`} defaultValue={sec.heading} />
                <TextArea label="Text" name={`section_${i}_body`} defaultValue={sec.body} rows={5} />
                <ImageField label="Section image (optional)" name={`section_${i}_imageFile`} current={sec.image} />
              </div>
            ))}
          </Card>
        )}

        <Card title="Menu & SEO">
          <Text label="Menu label" name="navLabel" defaultValue={page.navLabel} hint="How this page appears in the top menu." />
          <Toggle label="Show in the menu" name="showInNav" defaultChecked={page.showInNav} />
          <Text label="Browser tab title (SEO)" name="metaTitle" defaultValue={page.metaTitle} />
          <TextArea label="Search description (SEO)" name="metaDescription" defaultValue={page.metaDescription} rows={2}
            hint="The grey text under your link in Google. Aim for 140-160 characters." />
          <TextArea label="Keywords for this page" name="keywords" defaultValue={page.keywords} rows={2}
            hint="Comma separated. Added to the site-wide keywords." />
        </Card>

        <SaveBar />
      </form>
    </div>
  );
}
