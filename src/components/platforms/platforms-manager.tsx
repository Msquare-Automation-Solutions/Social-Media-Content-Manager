"use client";

import { useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/ui/back-button";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { useToast } from "@/components/ui/toast";
import { uploadToStorage } from "@/lib/upload-client";

type Channel = { id: string; name: string; icon: string; color: string };
const isImageIcon = (icon: string) => /^(https?:\/\/|\/)/.test(icon);

export function PlatformsManager({ initial, embedded = false }: { initial: Channel[]; embedded?: boolean }) {
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channel[]>(initial);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");

  async function add() {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    const r = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon: newIcon.trim() || undefined }),
    });
    setBusy(false);
    if (r.ok) {
      const created = await r.json();
      setChannels((c) => [...c, created]);
      setNewName("");
      setNewIcon("");
      toast("Platform added");
    } else toast("Couldn’t add platform.");
  }

  async function save(id: string, patch: Partial<Channel>) {
    const r = await fetch(`/api/channels/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (r.ok) {
      const updated = await r.json();
      setChannels((c) => c.map((x) => (x.id === id ? updated : x)));
      toast("Saved");
    } else toast("Couldn’t save.");
  }

  async function remove(c: Channel) {
    if (!confirm(`Remove “${c.name}”? Content tagged with it loses that platform.`)) return;
    const r = await fetch(`/api/channels/${c.id}`, { method: "DELETE" });
    if (r.ok) {
      setChannels((cs) => cs.filter((x) => x.id !== c.id));
      toast("Platform removed");
    } else toast("Couldn’t remove.");
  }

  const input = "rounded-[9px] border border-line bg-card px-3 py-2 text-[13px] text-ink outline-none focus:border-teal";

  const body = (
    <>

      {/* Add */}
      <div className="mb-6 flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate">
          Icon
          <IconField name={newName || "?"} icon={newIcon} onChange={setNewIcon} />
        </div>
        <label className="text-[11.5px] font-semibold text-slate">New platform
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="e.g. Threads" className={input + " mt-1 block w-56 font-normal"} />
        </label>
        <button onClick={add} disabled={busy || !newName.trim()} className="btn-premium rounded-[10px] px-4 py-2 text-[12.5px] font-semibold disabled:opacity-50">Add platform</button>
      </div>

      <div className="max-w-[620px] overflow-hidden rounded-card border border-line bg-card shadow-soft">
        {channels.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-slate">No platforms yet.</div>
        ) : (
          channels.map((c) => <Row key={c.id} c={c} onSave={save} onRemove={remove} inputCls={input} />)
        )}
      </div>
    </>
  );

  if (embedded) {
    return (
      <section className="mt-8">
        <div className="mb-3 flex items-center gap-3">
          <h3 className="font-display text-[15px] font-semibold">Platforms</h3>
          <span className="rounded-full bg-wash/[0.05] px-2 py-0.5 text-[11px] font-semibold text-slate">{channels.length}</span>
          <p className="text-[12px] text-slate">Social platforms content can target.</p>
        </div>
        {body}
      </section>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-1.5 flex items-center gap-3.5">
        <BackButton />
        <h2 className="font-display text-[19px]">Platforms</h2>
      </div>
      <p className="mb-5 max-w-[74ch] text-[13px] text-slate">
        The social platforms content can target. Rename them, set an emoji or upload/paste a
        logo image, or remove ones you don’t use. Known brands (Instagram, LinkedIn, Blog…)
        show their real logo automatically.
      </p>
      {body}
    </div>
  );
}

// Emoji field + upload/paste image logo (same as accounts), with a live preview.
function IconField({ name, icon, onChange }: { name: string; icon: string; onChange: (v: string) => void }) {
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function pick(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Pick an image file.");
    if (file.size > 2 * 1024 * 1024) return toast("Logo must be ≤ 2 MB.");
    setUploading(true);
    try {
      onChange(await uploadToStorage(file));
    } catch {
      toast("Couldn’t upload logo.");
    } finally {
      setUploading(false);
    }
  }
  const pickRef = useRef(pick);
  useEffect(() => { pickRef.current = pick; });
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const img = Array.from(e.clipboardData?.items ?? []).find((it) => it.type.startsWith("image/"));
      const file = img?.getAsFile();
      if (file) { e.preventDefault(); pickRef.current(file); }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white shadow-soft ring-1 ring-black/5">
        <PlatformIcon name={name} icon={icon || "✨"} size={18} />
      </span>
      {isImageIcon(icon) ? (
        <button type="button" onClick={() => onChange("")} title="Use an emoji instead" className="rounded-[9px] border border-line px-2.5 py-2 text-[11.5px] font-normal text-slate hover:border-teal">
          Custom logo · ✕
        </button>
      ) : (
        <input value={icon} onChange={(e) => onChange(e.target.value)} placeholder="✨" maxLength={2} className="w-14 rounded-[9px] border border-line bg-card px-2 py-2 text-center font-normal text-ink outline-none focus:border-teal" />
      )}
      <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} title="Upload an image, or paste one (⌘/Ctrl+V)" className="rounded-[9px] border border-line px-2.5 py-2 text-[11.5px] font-semibold text-teal-dark hover:border-teal disabled:opacity-50">
        {uploading ? "Uploading…" : "Upload / paste logo"}
      </button>
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
    </div>
  );
}

function Row({ c, onSave, onRemove, inputCls }: { c: Channel; onSave: (id: string, patch: Partial<Channel>) => void; onRemove: (c: Channel) => void; inputCls: string }) {
  const [name, setName] = useState(c.name);
  const [icon, setIcon] = useState(c.icon);
  const dirty = name.trim() !== c.name || icon !== c.icon;
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0">
      <IconField name={name} icon={icon} onChange={setIcon} />
      <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls + " flex-1 min-w-[140px]"} />
      {dirty && (
        <button onClick={() => onSave(c.id, { name: name.trim(), icon })} className="rounded-[9px] bg-teal px-3 py-2 text-[12.5px] font-semibold text-white">Save</button>
      )}
      <button onClick={() => onRemove(c)} title="Remove" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate hover:bg-wash/[0.08] hover:text-[#c23b2a]">🗑</button>
    </div>
  );
}
