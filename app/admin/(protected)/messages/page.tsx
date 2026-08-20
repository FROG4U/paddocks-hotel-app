import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { markMessageAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

function when(d: Date) {
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function MessagesPage({ searchParams }:
  { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const archived = show === "archived";

  const [messages, unreadCount, archivedCount] = await Promise.all([
    prisma.message.findMany({ where: { archived }, orderBy: { createdAt: "desc" } }),
    prisma.message.count({ where: { read: false, archived: false } }),
    prisma.message.count({ where: { archived: true } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-3xl text-navy">Messages</h1>
        <div className="text-sm">
          <Link href="/admin/messages"
            className={`px-3 py-1.5 rounded-md ${!archived ? "bg-navy text-white" : "text-ink/60 hover:text-navy"}`}>
            Inbox{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </Link>
          <Link href="/admin/messages?show=archived"
            className={`px-3 py-1.5 rounded-md ${archived ? "bg-navy text-white" : "text-ink/60 hover:text-navy"}`}>
            Archived{archivedCount > 0 ? ` (${archivedCount})` : ""}
          </Link>
        </div>
      </div>
      <p className="text-ink/60 mb-6">Enquiries sent from the contact form on the website.</p>

      {messages.length === 0 && (
        <p className="text-sm text-ink/50 bg-white rounded-xl border border-black/10 p-6">
          {archived ? "Nothing archived." : "No messages yet. They will appear here as soon as someone uses the contact form."}
        </p>
      )}

      <ul className="space-y-3">
        {messages.map((m) => (
          <li key={m.id}
            className={`bg-white rounded-xl border p-5 ${m.read ? "border-black/10" : "border-gold"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <div>
                <p className="font-medium text-navy">
                  {!m.read && <span className="inline-block w-2 h-2 rounded-full bg-gold mr-2 align-middle" />}
                  {m.name}
                  <span className="text-ink/40 font-normal"> about {m.subject || "an enquiry"}</span>
                </p>
                <p className="text-xs text-ink/50 mt-0.5">
                  {when(m.createdAt)}
                  {m.email ? <> · <a href={`mailto:${m.email}`} className="underline">{m.email}</a></> : null}
                  {m.phone ? <> · <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="underline">{m.phone}</a></> : null}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {m.email && (
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + (m.subject || "your enquiry"))}`}
                    className="bg-navy text-white text-xs font-semibold rounded px-3 py-1.5 hover:bg-navy/90">
                    Reply
                  </a>
                )}
                <Action id={m.id} act={m.read ? "unread" : "read"} label={m.read ? "Mark unread" : "Mark read"} archived={archived} />
                {!m.archived
                  ? <Action id={m.id} act="archive" label="Archive" archived={archived} />
                  : <Action id={m.id} act="restore" label="Restore" archived={archived} />}
                <Action id={m.id} act="delete" label="Delete" archived={archived} danger />
              </div>
            </div>
            <p className="text-sm text-ink/80 whitespace-pre-line leading-relaxed">{m.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Action({ id, act, label, archived, danger }:
  { id: string; act: string; label: string; archived: boolean; danger?: boolean }) {
  return (
    <form action={markMessageAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="do" value={act} />
      <input type="hidden" name="back" value={archived ? "/admin/messages?show=archived" : "/admin/messages"} />
      <button className={`text-xs ${danger ? "text-accent" : "text-ink/50"} hover:underline`}>{label}</button>
    </form>
  );
}
