"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CATEGORY_OPTIONS } from "@/lib/library";
import { useToast } from "@/components/ui/toast";
import { PlatformIcon } from "@/components/ui/platform-icon";

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
  channels: { id: string; scheduledFor: string | null }[];
  tags: string[];
  note?: string | null;
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
  const [postDates, setPostDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      asset.channels
        .filter((c) => c.scheduledFor)
        .map((c) => [c.id, c.scheduledFor!.slice(0, 10)]),
    ),
  );
  const [tags, setTags] = useState(asset.tags.join(", "));
  const [note, setNote] = useState(asset.note ?? "");
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
        channels: [...channels].map((id) => ({
          channelId: id,
          scheduledFor: postDates[id] ? new Date(postDates[id]).toISOString() : null,
        })),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        note: category === "OTHER" ? note.trim() || null : null,
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
        <div className="mb-4 grid grid-cols-5 gap-2">
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
        {category === "OTHER" && (
          <>
            <label className="mb-1.5 block text-xs font-semibold text-slate">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What is this? (optional)"
              rows={2}
              className="mb-4 w-full rounded-[10px] border border-line px-3 py-2 text-[13px] outline-none focus:border-teal"
            />
          </>
        )}

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
                <PlatformIcon name={c.name} icon={c.icon} size={14} className="inline-block shrink-0 align-text-bottom" /> {c.name}
              </button>
            );
          })}
        </div>

        {channels.size > 0 && (
          <div className="mb-4 space-y-1.5 rounded-[11px] bg-bg p-3">
            <div className="text-[11px] font-semibold text-slate">
              Post date per platform (optional)
            </div>
            {(options?.channels ?? [])
              .filter((c) => channels.has(c.id))
              .map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-[12.5px]">
                  <span className="w-28 shrink-0 truncate">
                    <PlatformIcon name={c.name} icon={c.icon} size={14} className="inline-block shrink-0 align-text-bottom" /> {c.name}
                  </span>
                  <input
                    type="date"
                    value={postDates[c.id] ?? ""}
                    onChange={(e) =>
                      setPostDates((p) => ({ ...p, [c.id]: e.target.value }))
                    }
                    className="rounded-[9px] border border-line bg-card px-2.5 py-1.5 outline-none focus:border-teal"
                  />
                  {postDates[c.id] && (
                    <button
                      onClick={() =>
                        setPostDates((p) => {
                          const n = { ...p };
                          delete n[c.id];
                          return n;
                        })
                      }
                      className="text-[11px] font-semibold text-slate hover:text-ink"
                    >
                      clear
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}

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
