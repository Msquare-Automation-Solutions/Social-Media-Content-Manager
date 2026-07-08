"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
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
    const r = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password }),
    });
    setBusy(false);
    if (!r.ok) {
      const b = await r.json().catch(() => ({}));
      setError(b.error ?? "Couldn't accept invite.");
      return;
    }
    router.push("/login?joined=1");
  }

  return (
    <form onSubmit={submit}>
      {error && (
        <div className="mb-3 rounded-[10px] bg-[#fdecea] px-3 py-2 text-[12.5px] text-[#c23b2a]">
          {error}
        </div>
      )}
      <Input label="Your name" value={name} onChange={setName} type="text" />
      <Input label="Password" value={password} onChange={setPassword} type="password" />
      <Input label="Confirm password" value={confirm} onChange={setConfirm} type="password" />
      <button
        disabled={busy || !name.trim()}
        className="mt-1 w-full rounded-[12px] bg-teal py-3 font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
      >
        {busy ? "Setting up…" : "Join workspace"}
      </button>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1.5 block text-xs font-semibold text-slate">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
      />
    </div>
  );
}
