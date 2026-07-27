"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null as { error?: string } | null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4">
      <form action={action} className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-8">
        <h1 className="font-display text-2xl text-navy text-center">The Paddocks Hotel</h1>
        <p className="text-center text-sm text-ink/60 mb-6">Admin sign in</p>

        {state?.error && (
          <p className="mb-4 text-sm text-white bg-accent rounded px-3 py-2">{state.error}</p>
        )}

        <label className="block text-sm font-medium mb-1">Email</label>
        <input name="email" type="email" required autoComplete="username"
          className="w-full border border-black/15 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-navy" />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input name="password" type="password" required autoComplete="current-password"
          className="w-full border border-black/15 rounded-md px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-navy" />

        <button type="submit" disabled={pending}
          className="w-full bg-navy text-white font-semibold rounded-md py-2.5 hover:bg-navy/90 disabled:opacity-60">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
