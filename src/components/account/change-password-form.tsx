"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useToast } from "@/components/ui/toast";

export function ChangePasswordForm() {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (next !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    const r = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setBusy(false);
    if (!r.ok) {
      const b = await r.json().catch(() => ({}));
      setError(b.error ?? "Couldn't change password.");
      return;
    }
    toast("Password changed — signing you back in…");
    // This session was invalidated (passwordChangedAt bumped); sign out.
    setTimeout(() => signOut({ callbackUrl: "/login?reset=1" }), 1200);
  }

  return (
    <form onSubmit={submit}>
      {error && (
        <div className="mb-3 rounded-[10px] bg-[#fdecea] px-3 py-2 text-[12.5px] text-[#c23b2a]">
          {error}
        </div>
      )}
      <Input label="Current password" value={current} onChange={setCurrent} />
      <Input label="New password" value={next} onChange={setNext} />
      <Input label="Confirm new password" value={confirm} onChange={setConfirm} />
      <button
        disabled={busy}
        className="mt-1 rounded-[11px] bg-teal px-5 py-2.5 font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
      >
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1.5 block text-xs font-semibold text-slate">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
      />
    </div>
  );
}
