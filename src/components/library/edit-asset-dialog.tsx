"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CATEGORY_OPTIONS } from "@/lib/library";
import { useToast } from "@/components/ui/toast";

type Options = {
  people: { id: string; name: string; label?: string | null }[];
  channels: { id: string; name: string; icon: string }[];
};

type EditAsset = {
  id: string;
  title: string;
  type: string;
  personId?: string;
  person: { id: string };
  channelIds: string[];
  tags: string[];
};

export function EditAssetDialog({
  asset,
  onClose,
  onSaved,
}: {
  asset: EditAsset;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: options } = useQuery<Options>({
    queryKey: ["options"],
    queryFn: async () => (await fetch("/api/options")).json(),
  });

  const [title, setTitle] = useState(asset.title);
  const [personId, setPersonId] = useState(asset.person.id);
  const [category, setCategory] = useState(asset.type);
  const [channels, setChannels] = useState<Set<string>>(new Set(asset.channelIds));
  const [tags, setTags] = useState(asset.tags.join(", "));
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && channels.size > 0;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    const r = await fetch(`/api/assets/${asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        type: category,
        personId,
        channelIds: [...channels],
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    setSaving(false);
    if (r.ok) {
      toast("Changes saved · previous kept as a version ✓");
      onSaved();
    } else {
      toast("Couldn't save changes.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-line px-6 py-4">
        <h2 className="flex-1 font-display text-[16px] font-semibold">Edit asset</h2>
        <button onClick={onClose} className="text-slate hover:text-ink">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <label className="mb-1.5 block text-xs font-semibold text-slate">Name</label>
        <input
          aria-label="Asset name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-4 w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
        />

        <label className="mb-1.5 block text-xs font-semibold text-slate">
          Person / creator
        </label>
        <select
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          className="mb-4 w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
        >
          {(options?.people ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.label ? ` · ${p.label}` : ""}
            </option>
          ))}
        </select>

        <label className="mb-1.5 block text-xs font-semibold text-slate">Category</label>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`rounded-[11px] border-[1.5px] px-1 py-2.5 text-[12px] font-semibold ${
                category === c.value
                  ? "border-teal bg-teal-soft text-teal-dark"
                  : "border-line text-slate hover:border-teal"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label className="mb-1.5 block text-xs font-semibold text-slate">
          Social platform(s)
        </label>
        <div className="mb-4 flex flex-wrap gap-2">
          {(options?.channels ?? []).map((c) => {
            const on = channels.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() =>
                  setChannels((s) => {
                    const n = new Set(s);
                    if (n.has(c.id)) n.delete(c.id);
                    else n.add(c.id);
                    return n;
                  })
                }
                className={`flex items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-[12.5px] font-semibold ${
                  on
                    ? "border-teal bg-teal-soft text-teal-dark"
                    : "border-line text-slate hover:border-teal"
                }`}
              >
                {c.icon} {c.name}
              </button>
            );
          })}
        </div>

        <label className="mb-1.5 block text-xs font-semibold text-slate">
          Tags (optional)
        </label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="automation, q3-campaign"
          className="w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
        />
      </div>

      <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
        <button onClick={onClose} className="px-3 py-2.5 font-semibold text-slate">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!canSave || saving}
          className="rounded-[11px] bg-teal px-5 py-2.5 font-semibold text-white hover:bg-teal-dark disabled:opacity-45"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
