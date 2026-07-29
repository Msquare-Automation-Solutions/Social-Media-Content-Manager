"use client";

import { useState } from "react";
import { BackButton } from "@/components/ui/back-button";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { useToast } from "@/components/ui/toast";

type Channel = { id: string; name: string; icon: string; color: string };

export function PlatformsManager({ initial }: { initial: Channel[] }) {
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

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-1.5 flex items-center gap-3.5">
        <BackButton />
        <h2 className="font-display text-[19px]">Platforms</h2>
      </div>
      <p className="mb-5 max-w-[74ch] text-[13px] text-slate">
        The social platforms content can target. Rename them, set an emoji icon (known brands
        like Instagram, LinkedIn and Blog get their real logo automatically), or remove ones you
        don’t use.
      </p>

      {/* Add */}
      <div className="mb-6 flex flex-wrap items-end gap-2">
        <label className="text-[11.5px] font-semibold text-slate">Icon (emoji)
          <input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="✨" maxLength={2} className={input + " mt-1 block w-16 text-center"} />
        </label>
        <label className="text-[11.5px] font-semibold text-slate">New platform
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="e.g. Threads" className={input + " mt-1 block w-56 font-normal"} />
        </label>
        <button onClick={add} disabled={busy || !newName.trim()} className="btn-premium rounded-[10px] px-4 py-2 text-[12.5px] font-semibold disabled:opacity-50">Add platform</button>
      </div>

      <div className="max-w-[560px] overflow-hidden rounded-card border border-line bg-card shadow-soft">
        {channels.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-slate">No platforms yet.</div>
        ) : (
          channels.map((c) => <Row key={c.id} c={c} onSave={save} onRemove={remove} inputCls={input} />)
        )}
      </div>
    </div>
  );
}

function Row({ c, onSave, onRemove, inputCls }: { c: Channel; onSave: (id: string, patch: Partial<Channel>) => void; onRemove: (c: Channel) => void; inputCls: string }) {
  const [name, setName] = useState(c.name);
  const [icon, setIcon] = useState(c.icon);
  const dirty = name.trim() !== c.name || icon !== c.icon;
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-wash/[0.06]">
        <PlatformIcon name={name} icon={icon} size={18} />
      </span>
      <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={2} className={inputCls + " w-14 text-center"} title="Emoji icon" />
      <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls + " flex-1"} />
      {dirty && (
        <button onClick={() => onSave(c.id, { name: name.trim(), icon })} className="rounded-[9px] bg-teal px-3 py-2 text-[12.5px] font-semibold text-white">Save</button>
      )}
      <button onClick={() => onRemove(c)} title="Remove" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate hover:bg-wash/[0.08] hover:text-[#c23b2a]">🗑</button>
    </div>
  );
}
