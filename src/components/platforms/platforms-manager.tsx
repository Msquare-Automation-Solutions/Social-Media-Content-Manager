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
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(c: Channel) {
    if (!confirm(`Remove “${c.name}”? Content tagged with it loses that platform.`)) return;
    setBusy(true);
    const r = await fetch(`/api/channels/${c.id}`, { method: "DELETE" });
    setBusy(false);
    if (r.ok) { setChannels((cs) => cs.filter((x) => x.id !== c.id)); toast("Platform removed"); }
    else toast("Couldn’t remove.");
  }

  const list = (
    <>
      {addOpen && (
        <PlatformForm
          onClose={() => setAddOpen(false)}
          onSaved={(c) => { setChannels((cs) => [...cs, c]); setAddOpen(false); }}
        />
      )}
      <div className="overflow-hidden rounded-card border border-line bg-card shadow-soft">
        {channels.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-slate">No platforms yet.</div>}
        {channels.map((c) =>
          editId === c.id ? (
            <div key={c.id} className="border-b border-line last:border-0">
              <PlatformForm
                channel={c}
                onClose={() => setEditId(null)}
                onSaved={(u) => { setChannels((cs) => cs.map((x) => (x.id === u.id ? u : x))); setEditId(null); }}
              />
            </div>
          ) : (
            <div key={c.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-white shadow-soft ring-1 ring-black/5">
                <PlatformIcon name={c.name} icon={c.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{c.name}</div>
              <div className="flex gap-1.5">
                <button onClick={() => { setEditId(c.id); setAddOpen(false); }} className="rounded-[8px] border border-line px-2.5 py-1 text-[11.5px] font-semibold text-teal-dark hover:border-teal">Edit</button>
                <button onClick={() => remove(c)} disabled={busy} className="rounded-[8px] border border-line px-2.5 py-1 text-[11.5px] font-semibold text-[#c23b2a] hover:border-[#c23b2a] disabled:opacity-50">Delete</button>
              </div>
            </div>
          ),
        )}
      </div>
    </>
  );

  const addButton = (
    <button
      onClick={() => { setAddOpen((v) => !v); setEditId(null); }}
      className="ml-auto rounded-[10px] border border-dashed border-line px-3 py-1.5 text-[12.5px] font-semibold text-teal-dark transition hover:border-teal hover:bg-teal-soft"
    >
      ＋ Add platform
    </button>
  );

  if (embedded) {
    return (
      <section className="mt-8">
        <div className="mb-3 flex items-center gap-3">
          <h3 className="font-display text-[15px] font-semibold">Platforms</h3>
          <span className="rounded-full bg-wash/[0.05] px-2 py-0.5 text-[11px] font-semibold text-slate">{channels.length}</span>
          <p className="text-[12px] text-slate">Social platforms content can target.</p>
          {addButton}
        </div>
        {list}
      </section>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-1.5 flex items-center gap-3.5">
        <BackButton />
        <h2 className="font-display text-[19px]">Platforms</h2>
        {addButton}
      </div>
      <p className="mb-5 max-w-[74ch] text-[13px] text-slate">
        The social platforms content can target. Known brands (Instagram, LinkedIn, Blog…) show
        their real logo automatically.
      </p>
      {list}
    </div>
  );
}

// Add / edit form — mirrors the Accounts form (icon + name).
function PlatformForm({ channel, onClose, onSaved }: { channel?: Channel; onClose: () => void; onSaved: (c: Channel) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(channel?.name ?? "");
  const [icon, setIcon] = useState(channel?.icon ?? "");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(channel);

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    const r = await fetch(isEdit ? `/api/channels/${channel!.id}` : "/api/channels", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), icon: icon.trim() || undefined }),
    });
    setSaving(false);
    if (r.ok) { onSaved(await r.json()); toast(isEdit ? "Platform updated ✓" : `Platform “${name.trim()}” added ✓`); }
    else toast("Couldn’t save platform.");
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2.5 rounded-card border border-line bg-bg/60 px-4 py-3">
      <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate">
        Icon
        <IconField name={name || "?"} icon={icon} onChange={setIcon} />
      </div>
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate">
        Name
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} placeholder="e.g. Threads" className="w-52 rounded-[9px] border border-line bg-card px-2.5 py-2 font-normal text-ink outline-none focus:border-teal" />
      </label>
      <button onClick={save} disabled={!name.trim() || saving} className="btn-premium rounded-[10px] px-4 py-2 text-[12.5px] font-semibold disabled:opacity-50">{saving ? "Saving…" : isEdit ? "Save" : "Add"}</button>
      <button onClick={onClose} className="px-2 py-2 text-[12.5px] font-semibold text-slate">Cancel</button>
    </div>
  );
}

// Emoji field + upload/paste image logo, with a live preview.
function IconField({ name, icon, onChange }: { name: string; icon: string; onChange: (v: string) => void }) {
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function pick(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Pick an image file.");
    if (file.size > 2 * 1024 * 1024) return toast("Logo must be ≤ 2 MB.");
    setUploading(true);
    try { onChange(await uploadToStorage(file)); } catch { toast("Couldn’t upload logo."); } finally { setUploading(false); }
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
        <PlatformIcon name={name} icon={icon} size={18} />
      </span>
      <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} title="Upload an image, or paste one (⌘/Ctrl+V)" className="rounded-[9px] border border-line px-2.5 py-2 text-[11.5px] font-semibold text-teal-dark hover:border-teal disabled:opacity-50">
        {uploading ? "Uploading…" : isImageIcon(icon) ? "Replace logo" : "Upload / paste logo"}
      </button>
      {isImageIcon(icon) && (
        <button type="button" onClick={() => onChange("")} title="Remove logo" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate hover:bg-wash/[0.08] hover:text-[#c23b2a]">✕</button>
      )}
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
    </div>
  );
}
