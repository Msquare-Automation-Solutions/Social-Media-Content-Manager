"use client";

import { useState } from "react";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <div className="mb-4 rounded-[10px] bg-teal-soft px-3 py-2.5 text-[12.5px] text-teal-dark">
          If an account exists for that email, we&apos;ve sent a reset link. Check
          your inbox. <span className="opacity-70">(Dev: see the server console.)</span>
        </div>
        <a href="/login" className="block text-center text-[12.5px] font-semibold text-teal-dark">
          ← Back to sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <label className="mb-1.5 block text-xs font-semibold text-slate">Email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="mb-3 w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
      />
      <button
        disabled={busy || !email.trim()}
        className="w-full rounded-[12px] bg-teal py-3 font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send reset link"}
      </button>
      <a href="/login" className="mt-3.5 block text-center text-[12.5px] font-semibold text-teal-dark">
        ← Back to sign in
      </a>
    </form>
  );
}
