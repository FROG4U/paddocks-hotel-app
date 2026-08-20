"use client";

import { useActionState } from "react";
import { sendMessageAction } from "@/lib/actions";

const initial = { ok: false, error: "" };

export default function ContactForm() {
  const [state, action, pending] = useActionState(sendMessageAction, initial);

  if (state.ok) {
    return (
      <div className="bg-cream border border-gold/40 rounded-lg p-8 text-center">
        <h3 className="font-display text-2xl text-navy mb-2">Thank you</h3>
        <p className="text-ink/70">
          Your message has come through and we will get back to you shortly. If it is urgent,
          please call us instead.
        </p>
      </div>
    );
  }

  const field = "w-full border border-black/15 rounded-sm px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-navy";

  return (
    <form action={action} className="space-y-4 text-left">
      {state.error && (
        <p className="rounded-sm bg-red-600 text-white text-sm px-4 py-3">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-medium text-navy mb-1">Your name</span>
          <input name="name" required className={field} autoComplete="name" />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-navy mb-1">Email</span>
          <input name="email" type="email" required className={field} autoComplete="email" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-medium text-navy mb-1">Phone (optional)</span>
          <input name="phone" className={field} autoComplete="tel" />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-navy mb-1">What is it about?</span>
          <select name="subject" className={field} defaultValue="A room">
            <option>A room</option>
            <option>A table in the restaurant</option>
            <option>A wedding</option>
            <option>A party or celebration</option>
            <option>A meeting or conference</option>
            <option>Something else</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-navy mb-1">Message</span>
        <textarea name="body" rows={6} required className={field}
          placeholder="Let us know your dates and rough numbers and we will come back to you with options." />
      </label>

      {/* Simple spam trap: real people leave this empty. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off"
        className="absolute left-[-9999px] w-px h-px" aria-hidden="true" />

      <button type="submit" disabled={pending} className="btn-brand disabled:opacity-60">
        {pending ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
