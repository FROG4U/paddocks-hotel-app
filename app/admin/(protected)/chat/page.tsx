import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { aiConfigured } from "@/lib/ai";
import { deleteConversationAction } from "@/lib/actions";
import { Card } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

function when(d: Date) {
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default async function ChatAdminPage() {
  const [s, conversations] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: 1 } }),
    prisma.chatConversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { messages: { orderBy: { createdAt: "asc" } } },
    }),
  ]);

  const ai = aiConfigured();

  return (
    <div>
      <h1 className="font-display text-3xl text-navy mb-1">Chat</h1>
      <p className="text-ink/60 mb-6">
        The assistant in the corner of the website, and everything visitors have asked it.
      </p>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="bg-white rounded-xl border border-black/10 p-5">
          <p className="text-3xl font-display text-navy">{conversations.length}</p>
          <p className="text-sm text-ink/60 mt-1">recent conversations</p>
        </div>
        <div className="bg-white rounded-xl border border-black/10 p-5">
          <p className="text-sm font-medium text-navy mb-1">Widget</p>
          <p className="text-xs text-ink/60">
            {s?.chatEnabled ? "Showing on the website" : "Hidden"}
          </p>
          <Link href="/admin/settings" className="text-xs underline text-ink/50">Change in Settings</Link>
        </div>
        <div className="bg-white rounded-xl border border-black/10 p-5">
          <p className="text-sm font-medium text-navy mb-1">AI</p>
          <p className="text-xs text-ink/60">
            {ai ? "Connected" : "No API key, so the assistant just gives your phone number"}
          </p>
        </div>
      </div>

      {!ai && (
        <Card title="Connect the assistant">
          <p className="text-sm text-ink/70">
            Without an API key the chat window still opens, but every reply is the same short
            message asking the visitor to phone or email you. Add{" "}
            <code className="bg-cream px-1 rounded">ANTHROPIC_API_KEY</code> in Plesk under Node.js,
            Custom environment variables, then restart the app. The same key powers the SEO writer.
          </p>
        </Card>
      )}

      <h2 className="font-display text-xl text-navy mb-3">Conversations</h2>

      {conversations.length === 0 && (
        <p className="text-sm text-ink/50 bg-white rounded-xl border border-black/10 p-6">
          Nothing yet. Conversations appear here as soon as visitors start using the chat.
        </p>
      )}

      <ul className="space-y-4">
        {conversations.map((c) => (
          <li key={c.id} className="bg-white rounded-xl border border-black/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-ink/50">
                {when(c.createdAt)} · {c.messages.filter((m) => m.role === "user").length} questions
              </p>
              <form action={deleteConversationAction}>
                <input type="hidden" name="id" value={c.id} />
                <button className="text-xs text-accent hover:underline">Delete</button>
              </form>
            </div>
            <div className="space-y-2">
              {c.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-line
                    ${m.role === "user" ? "bg-navy text-white" : "bg-cream text-ink"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-ink/50 mt-6">
        The assistant only knows what is on this website: your rooms, prices, opening hours,
        pages, wedding packages and Explore cards. Update those and it updates too. It cannot
        take bookings or see availability, and it is told to hand people to your phone and email
        for anything it does not know.
      </p>
    </div>
  );
}
