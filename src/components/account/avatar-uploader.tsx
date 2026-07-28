"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";

export function AvatarUploader({
  name,
  color,
  initialUrl,
}: {
  name: string;
  color: string;
  initialUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    const body = new FormData();
    body.set("file", file);
    const r = await fetch("/api/account/avatar", { method: "POST", body });
    setBusy(false);
    if (r.ok) {
      const { avatarUrl } = await r.json();
      setUrl(avatarUrl);
      router.refresh();
    } else {
      setErr((await r.text()) || "Upload failed.");
    }
  }

  async function remove() {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/account/avatar", { method: "DELETE" });
    setBusy(false);
    if (r.ok) {
      setUrl(null);
      router.refresh();
    } else {
      setErr("Couldn’t remove.");
    }
  }

  return (
    <div className="mb-5 flex items-center gap-4">
      <Avatar name={name} color={color} url={url} size={64} />
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-[9px] border border-line px-3 py-1.5 text-[12.5px] font-semibold text-teal-dark hover:border-teal disabled:opacity-50"
          >
            {busy ? "Saving…" : url ? "Change photo" : "Upload photo"}
          </button>
          {url && (
            <button
              onClick={remove}
              disabled={busy}
              className="rounded-[9px] border border-line px-3 py-1.5 text-[12.5px] font-semibold text-slate hover:border-[#c23b2a] hover:text-[#c23b2a] disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
        <span className="text-[11px] text-slate">Square image, ≤ 5MB. Shown across the app.</span>
        {err && <span className="text-[11px] text-[#c23b2a]">{err}</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
