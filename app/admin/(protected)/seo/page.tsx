import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data";
import { aiConfigured } from "@/lib/ai";
import { generateSeoAction, applySeoDraftAction, discardSeoDraftAction } from "@/lib/actions";
import { SavedBanner, Text, TextArea, Card } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

// Google shows roughly 60 characters of the title and 155 of the description.
const TITLE_OK = [40, 60] as const;
const DESC_OK = [130, 158] as const;

type Row = {
  kind: "page" | "room";
  id: string;
  name: string;
  url: string;
  editHref: string;
  title: string;
  description: string;
  keywords: string;
};

function score(row: Row) {
  const issues: string[] = [];
  const t = row.title.length;
  const d = row.description.length;
  if (!t) issues.push("No title");
  else if (t < TITLE_OK[0]) issues.push(`Title short (${t})`);
  else if (t > TITLE_OK[1]) issues.push(`Title long (${t})`);
  if (!d) issues.push("No description");
  else if (d < DESC_OK[0]) issues.push(`Description short (${d})`);
  else if (d > DESC_OK[1]) issues.push(`Description long (${d})`);
  if (!row.keywords.trim()) issues.push("No keywords");
  return issues;
}

function Pill({ text, tone }: { text: string; tone: "good" | "warn" | "bad" }) {
  const cls = tone === "good" ? "bg-green-100 text-green-800"
    : tone === "warn" ? "bg-amber-100 text-amber-900"
    : "bg-red-100 text-red-800";
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{text}</span>;
}

export default async function SeoPage({ searchParams }:
  { searchParams: Promise<{ applied?: string; generated?: string; error?: string }> }) {
  const { applied, generated, error } = await searchParams;

  const [s, pages, rooms, drafts] = await Promise.all([
    getSettings(),
    prisma.page.findMany({ orderBy: { order: "asc" } }),
    prisma.room.findMany({ orderBy: { order: "asc" } }),
    prisma.seoDraft.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const rows: Row[] = [
    ...pages.map((p) => ({
      kind: "page" as const, id: p.id, name: p.title,
      url: p.slug === "home" ? "/" : `/${p.slug}`,
      editHref: `/admin/pages/${p.id}`,
      title: p.metaTitle, description: p.metaDescription, keywords: p.keywords,
    })),
    ...rooms.map((r) => ({
      kind: "room" as const, id: r.id, name: r.name,
      url: `/rooms/${r.slug}`,
      editHref: `/admin/rooms/${r.id}`,
      title: r.metaTitle, description: r.metaDescription, keywords: r.keywords,
    })),
  ];

  const clean = rows.filter((r) => score(r).length === 0).length;
  const ai = aiConfigured();

  return (
    <div>
      <h1 className="font-display text-3xl text-navy mb-1">SEO</h1>
      <p className="text-ink/60 mb-6">
        How each page looks to Google, and a free writer that fixes the bits that need work.
      </p>

      <SavedBanner show={applied === "1"} text="Applied - the page is live with the new wording." />
      <SavedBanner show={!!generated} text={`Suggestion ready for ${generated}. Check it over, edit anything you like, then apply.`} />
      {error && (
        <div className="mb-5 rounded-md bg-red-600 text-white text-sm px-4 py-2.5">{error}</div>
      )}

      {/* Overall health */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="bg-white rounded-xl border border-black/10 p-5">
          <p className="text-3xl font-display text-navy">{clean}/{rows.length}</p>
          <p className="text-sm text-ink/60 mt-1">pages fully optimised</p>
        </div>
        <div className="bg-white rounded-xl border border-black/10 p-5">
          <p className="text-sm font-medium text-navy mb-2">Search files</p>
          <p className="text-xs text-ink/60">
            <a href="/sitemap.xml" target="_blank" className="underline">sitemap.xml</a>
            {" · "}
            <a href="/robots.txt" target="_blank" className="underline">robots.txt</a>
          </p>
          <p className="text-xs text-ink/50 mt-2">Both generated automatically.</p>
        </div>
        <div className="bg-white rounded-xl border border-black/10 p-5">
          <p className="text-sm font-medium text-navy mb-2">Writer</p>
          <Pill text="Free, built in" tone="good" />
          <p className="text-xs text-ink/50 mt-2">
            {ai ? "Optional AI writer also connected." : "No subscription needed."}
          </p>
        </div>
      </div>

      <Card title="How the writer works">
        <p className="text-sm text-ink/70">
          <strong>Write for me</strong> is built into the site and costs nothing, however many times
          you use it. It takes the page&rsquo;s own wording and combines it with the search terms
          that matter for a hotel in this area, keeping the title and description to the lengths
          Google shows in full. You can edit anything it suggests before applying it.
        </p>
        <p className="text-sm text-ink/70">
          {ai
            ? "The ✨ AI button is the optional extra: it can rewrite the page text as well, but each click uses your Anthropic key and costs a small amount."
            : "There is also an optional AI writer that can rewrite the page text too. It needs an Anthropic API key and charges per use, so it is off unless you add one. You do not need it."}
        </p>
      </Card>

      {/* Pending AI suggestions */}
      {drafts.map((d) => (
        <section key={d.id} id={`draft-${d.targetId}`}
          className="bg-white rounded-xl border-2 border-gold p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{d.source === "ai" ? "✨" : "📝"}</span>
            <h2 className="font-display text-lg text-navy">
              {d.source === "ai" ? "AI suggestion" : "Suggestion"} for {d.targetName}
            </h2>
          </div>
          {d.notes && <p className="text-sm text-ink/60 mb-4">{d.notes}</p>}

          <form action={applySeoDraftAction} className="space-y-4">
            <input type="hidden" name="id" value={d.id} />
            <Text label={`Browser tab title (${d.metaTitle.length} characters)`} name="metaTitle" defaultValue={d.metaTitle} />
            <TextArea label={`Search description (${d.metaDescription.length} characters)`} name="metaDescription" defaultValue={d.metaDescription} rows={3} />
            <TextArea label="Keywords" name="keywords" defaultValue={d.keywords} rows={2} />
            {d.bodyText && (
              <>
                <TextArea label="Rewritten page text" name="bodyText" defaultValue={d.bodyText} rows={6} />
                <label className="flex items-center gap-2 text-sm text-navy">
                  <input type="checkbox" name="applyBody" defaultChecked className="w-4 h-4 accent-[var(--navy)]" />
                  Also replace the page text with this
                </label>
              </>
            )}
            <div className="flex gap-3 pt-1">
              <button className="bg-navy text-white font-semibold rounded-md px-5 py-2.5 hover:bg-navy/90">
                Apply to the website
              </button>
            </div>
          </form>
          <form action={discardSeoDraftAction} className="mt-3">
            <input type="hidden" name="id" value={d.id} />
            <button className="text-sm text-ink/50 hover:text-accent">Discard this suggestion</button>
          </form>
        </section>
      ))}

      {/* Per-page audit */}
      <div className="bg-white rounded-xl border border-black/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream/60 text-left text-xs uppercase text-ink/60">
            <tr>
              <th className="px-4 py-3">Page</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 w-px whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const issues = score(r);
              const hasDraft = drafts.some((d) => d.targetId === r.id);
              return (
                <tr key={`${r.kind}-${r.id}`} className="border-t border-black/5 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy">{r.name}</p>
                    <p className="text-xs text-ink/40">{r.url}</p>
                    <p className="text-xs text-ink/60 mt-1 line-clamp-1">{r.title || "No title set"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {issues.length === 0
                      ? <Pill text="Looks good" tone="good" />
                      : <span className="flex flex-wrap gap-1">
                          {issues.map((i) => <Pill key={i} text={i} tone={i.startsWith("No ") ? "bad" : "warn"} />)}
                        </span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 justify-end">
                      <Link href={r.editHref} className="text-xs text-ink/50 hover:text-navy underline">Edit</Link>
                      {!hasDraft && (
                        <form action={generateSeoAction}>
                          <input type="hidden" name="targetType" value={r.kind} />
                          <input type="hidden" name="targetId" value={r.id} />
                          <input type="hidden" name="mode" value="free" />
                          <button className="bg-gold text-navy text-xs font-semibold rounded px-3 py-1.5 hover:brightness-95">
                            Write for me
                          </button>
                        </form>
                      )}
                      {ai && !hasDraft && (
                        <form action={generateSeoAction}>
                          <input type="hidden" name="targetType" value={r.kind} />
                          <input type="hidden" name="targetId" value={r.id} />
                          <input type="hidden" name="mode" value="ai" />
                          <button title="Uses your Anthropic API key, which costs a small amount per click"
                            className="border border-gold text-navy text-xs font-semibold rounded px-3 py-1.5 hover:bg-gold/10">
                            ✨ AI
                          </button>
                        </form>
                      )}
                      {hasDraft && <span className="text-xs text-gold font-medium">Suggestion above</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink/50 mt-5">
        Site-wide title, description and keywords live under{" "}
        <Link href="/admin/settings" className="underline">Contact &amp; Settings</Link>.
        Your site address is set to {s.siteUrl}.
      </p>
    </div>
  );
}
