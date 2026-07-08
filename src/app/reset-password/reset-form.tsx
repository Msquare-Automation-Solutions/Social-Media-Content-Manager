"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    const r = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setBusy(false);
    if (!r.ok) {
      const b = await r.json().catch(() => ({}));
      setError(b.error ?? "Couldn't reset password.");
      return;
    }
    router.push("/login?reset=1");
  }

  return (
    <form onSubmit={submit}>
      {error && (
        <div className="mb-3 rounded-[10px] bg-[#fdecea] px-3 py-2 text-[12.5px] text-[#c23b2a]">
          {error}
        </div>
      )}
      <label className="mb-1.5 block text-xs font-semibold text-slate">New password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        className="mb-3 w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
      />
      <label className="mb-1.5 block text-xs font-semibold text-slate">
        Confirm new password
      </label>
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="••••••••"
        className="mb-3 w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
      />
      <button
        disabled={busy}
        className="w-full rounded-[12px] bg-teal py-3 font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
      >
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
