"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CATEGORY_OPTIONS } from "@/lib/library";
import { useToast } from "@/components/ui/toast";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { gradientFor } from "@/lib/artifact-view";

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
  thumbnailUrl?: string | null;
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

  // Thumbnail editing: a custom image replaces the stored thumbnail on save.
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(asset.thumbnailUrl ?? null);
  const thumbInput = useRef<HTMLInputElement>(null);

  const [dragThumb, setDragThumb] = useState(false);

  function pickThumb(f: File | null | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast("Pick an image file for the thumbnail.");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      toast("Thumbnail must be ≤ 2 MB.");
      return;
    }
    setThumbFile(f);
    setThumbPreview(URL.createObjectURL(f));
  }

  // Paste an image from the clipboard (e.g. a screenshot) → thumbnail while the
  // dialog is open. A ref keeps the listener pointing at the latest pickThumb.
  const pickThumbRef = useRef(pickThumb);
  useEffect(() => {
    pickThumbRef.current = pickThumb;
  });
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const img = Array.from(items).find((it) => it.type.startsWith("image/"));
      const file = img?.getAsFile();
      if (file) {
        e.preventDefault();
        pickThumbRef.current(file);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const canSave = title.trim().length > 0 && channels.size > 0;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      type: category,
      personId,
      channels: [...channels].map((id) => ({
        channelId: id,
        scheduledFor: postDates[id] ? new Date(postDates[id]).toISOString() : null,
      })),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      note: category === "OTHER" ? note.trim() || null : null,
    };
    // Send multipart (with the thumbnail file) only when a new one was picked;
    // otherwise a plain JSON PATCH.
    let r: Response;
    if (thumbFile) {
      const form = new FormData();
      form.set("payload", JSON.stringify(payload));
      form.set("thumbnail", thumbFile);
      r = await fetch(`/api/assets/${asset.id}`, { method: "PATCH", body: form });
    } else {
      r = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
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
        <label className="mb-1.5 block text-xs font-semibold text-slate">Thumbnail</label>
        <div className="mb-4 flex items-center gap-3">
          <div
            onClick={() => thumbInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragThumb(true);
            }}
            onDragLeave={() => setDragThumb(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragThumb(false);
              pickThumb(Array.from(e.dataTransfer.files).find((x) => x.type.startsWith("image/")));
            }}
            className={`relative grid h-[70px] w-[124px] flex-shrink-0 cursor-pointer place-items-center overflow-hidden rounded-[10px] border ${
              dragThumb ? "border-teal ring-2 ring-teal/40" : "border-line"
            }`}
          >
            {thumbPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbPreview} alt="thumbnail preview" className="h-full w-full object-cover" />
            ) : (
              <div
                className="grid h-full w-full place-items-center px-2 text-center text-[10px] font-semibold leading-tight text-white"
                style={{ background: `linear-gradient(135deg, ${gradientFor(title || asset.title)[0]}, ${gradientFor(title || asset.title)[1]})` }}
              >
                {title || asset.title}
              </div>
            )}
            {dragThumb && (
              <div className="absolute inset-0 grid place-items-center bg-teal/20 text-[10px] font-bold text-teal-dark">
                Drop image
              </div>
            )}
          </div>
          <div className="text-[12px] text-slate">
            <button
              onClick={() => thumbInput.current?.click()}
              className="rounded-[9px] border border-line px-3 py-1.5 font-semibold text-teal-dark hover:border-teal"
            >
              Change thumbnail
            </button>
            <div className="mt-1 text-[11px]">
              {thumbFile ? "New image · cropped to 16:9" : "Click, drop or paste an image (≤ 2 MB)"}
            </div>
            <input
              ref={thumbInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickThumb(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

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
