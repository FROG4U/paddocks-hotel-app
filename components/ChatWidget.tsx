"use client";

import { useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; text: string };

type Props = {
  name: string;
  greeting: string;
  phone: string;
  email: string;
};

const STORAGE_KEY = "paddocks_chat";

export default function ChatWidget({ name, greeting, phone, email }: Props) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the conversation going if the visitor moves between pages.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { id: string | null; turns: Turn[] };
        setConversationId(parsed.id);
        setTurns(parsed.turns || []);
      }
    } catch { /* no saved chat */ }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: conversationId, turns }));
    } catch { /* private browsing */ }
  }, [conversationId, turns]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, open, sending]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || sending) return;
    setDraft("");
    setTurns((t) => [...t, { role: "user", text }]);
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
      });
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      setTurns((t) => [...t, {
        role: "assistant",
        text: data.reply || `Sorry, something went wrong. Please call us on ${phone}.`,
      }]);
    } catch {
      setTurns((t) => [...t, {
        role: "assistant",
        text: `Sorry, I could not connect. Please call us on ${phone} or email ${email}.`,
      }]);
    } finally {
      setSending(false);
    }
  }

  const QUICK = [
    "Do you have rooms available?",
    "What are your restaurant hours?",
    "Tell me about weddings",
    "What is there to do nearby?",
  ];

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : `Chat with ${name}`}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-xl bg-gold text-navy shadow-lg
          grid place-items-center hover:brightness-95 transition"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
            <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h10A1.5 1.5 0 0 1 16 5.5v6A1.5 1.5 0 0 1 14.5 13H8l-3 3z" />
            <path d="M8 15.5V16a1.5 1.5 0 0 0 1.5 1.5H16l3 3v-3h.5A1.5 1.5 0 0 0 21 16v-6a1.5 1.5 0 0 0-1.5-1.5H19" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed z-50 bottom-24 right-5 left-5 sm:left-auto sm:w-[380px]
          max-h-[70vh] flex flex-col rounded-xl overflow-hidden shadow-2xl bg-white">
          <header className="bg-navy text-white px-5 py-4">
            <p className="font-display text-lg">{name}</p>
            <p className="text-xs text-white/60">Ask about rooms, dining, events and the local area</p>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-cream/40">
            <Bubble role="assistant">{greeting}</Bubble>

            {turns.length === 0 && (
              <div className="space-y-2 pt-1">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => send(q)}
                    className="block w-full text-left text-sm bg-white border border-gold/50 rounded-lg px-4 py-2.5
                      text-navy hover:bg-gold/10 transition">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {turns.map((t, i) => <Bubble key={i} role={t.role}>{t.text}</Bubble>)}
            {sending && <Bubble role="assistant"><span className="opacity-60">Typing...</span></Bubble>}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(draft); }}
            className="border-t border-black/10 p-3 flex gap-2 bg-white"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message..."
              maxLength={2000}
              className="flex-1 border border-black/15 rounded-lg px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-navy"
            />
            <button type="submit" disabled={sending || !draft.trim()}
              className="bg-gold text-navy font-semibold rounded-lg px-4 text-sm disabled:opacity-50">
              Send
            </button>
          </form>

          <p className="text-[11px] text-center text-ink/50 pb-3 px-4 bg-white">
            You are chatting with an AI assistant. For bookings please call{" "}
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="underline">{phone}</a>.
          </p>
        </div>
      )}
    </>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line
        ${mine ? "bg-navy text-white rounded-br-sm" : "bg-white text-ink border border-black/5 rounded-bl-sm"}`}>
        {children}
      </div>
    </div>
  );
}
