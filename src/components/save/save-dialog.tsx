"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSaveDialog, type SaveTarget } from "@/components/save/dialog-context";
import { useToast } from "@/components/ui/toast";
import { CATEGORY_OPTIONS, TYPE_LABELS, LIBRARY_SLUGS } from "@/lib/library";
import { initials } from "@/lib/colors";
import {
  artifactToHtml,
  artifactDefaultCategory,
  gradientFor,
} from "@/lib/artifact-view";

type Options = {
  people: { id: string; name: string; label?: string | null; avatarColor: string }[];
  channels: { id: string; name: string; icon: string; color: string }[];
  canEdit: boolean;
  mePersonId: string | null;
  isAdmin: boolean;
};

type Draft = {
  title: string;
  category: string;
  tags: string[];
  html?: string;
  source: "GENERATED" | "UPLOAD" | "LINK";
  chatMessageId?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  file?: File;
  url?: string;
  imagePreviewUrl?: string;
  gradientSeed: string;
  fileMeta?: string;
};

function draftFromTarget(
  target: Exclude<SaveTarget, { mode: "edit" }>,
): Draft {
  if (target.mode === "artifact") {
    const a = target.artifact;
    return {
      title: a.title,
      category: artifactDefaultCategory(a),
      tags: a.kind === "BLOGPOST" ? a.tags ?? [] : [],
      html: artifactToHtml(a),
      source: "GENERATED",
      chatMessageId: target.messageId,
      gradientSeed: a.title,
    };
  }
  if (target.mode === "link") {
    const l = target.link;
    return {
      title: l.name.replace(/\.[a-z0-9]+$/i, "") || "Linked file",
      category: "IMAGE",
      tags: [],
      source: "LINK",
      url: l.url,
      gradientSeed: l.url,
      fileMeta: `🔗 ${l.url}`,
    };
  }
  // upload
  const f = target.file;
  return {
    title: f.name.replace(/\.[a-z0-9]+$/i, ""),
    category: f.category,
    tags: [],
    source: "UPLOAD",
    filename: f.name,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    file: f.file,
    imagePreviewUrl: f.previewUrl,
    gradientSeed: f.name,
    fileMeta: `${f.mimeType || "file"} · ${formatBytes(f.sizeBytes)}`,
  };
}

export function SaveDialog() {
  const { target, onSaved, close } = useSaveDialog();

  // The "edit" mode reuses this dialog via a different entry (Phase 4/6).
  if (target === null || target.mode === "edit") return null;
  return (
    <SaveDialogInner
      key={targetKey(target)}
      target={target}
      onSaved={onSaved}
      close={close}
    />
  );
}

function SaveDialogInner({
  target,
  onSaved,
  close,
}: {
  target: Exclude<SaveTarget, { mode: "edit" }>;
  onSaved?: (r: { type: string }) => void;
  close: () => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();

  const draft = useMemo(() => draftFromTarget(target), [target]);

  const { data: options } = useQuery<Options>({
    queryKey: ["options"],
    queryFn: async () => {
      const r = await fetch("/api/options");
      if (!r.ok) throw new Error("Failed to load options");
      return r.json();
    },
  });

  const [title, setTitle] = useState(draft.title);
  // Admins may override the creator; for everyone else it stays their own name.
  const [personId, setPersonId] = useState<string>("");
  const [category, setCategory] = useState(draft.category);
  const [channels, setChannels] = useState<Set<string>>(new Set());
  // channelId → post date (yyyy-mm-dd), optional per platform.
  const [postDates, setPostDates] = useState<Record<string, string>>({});
  const [tags, setTags] = useState(draft.tags.join(", "));
  const [customThumb, setCustomThumb] = useState<File | null>(null);
  const [customThumbUrl, setCustomThumbUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Inline add-person (admins) / add-platform
  const [personFormOpen, setPersonFormOpen] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: "", email: "", label: "" });
  const [platFormOpen, setPlatFormOpen] = useState(false);
  const [newPlat, setNewPlat] = useState("");
  const [adding, setAdding] = useState(false);

  const thumbInput = useRef<HTMLInputElement>(null);

  // New uploads/generations default to the uploader's own Person record. Admins
  // can pick a different creator; everyone else is locked to themselves
  // (reassignable later via Edit).
  const effectivePersonId =
    personId || options?.mePersonId || options?.people[0]?.id || "";
  const mePerson = options?.people.find((p) => p.id === effectivePersonId);

  const [c1, c2] = gradientFor(draft.gradientSeed);
  const previewImage = customThumbUrl ?? draft.imagePreviewUrl ?? null;
  const canEdit = options?.canEdit ?? false;
  const canSave =
    title.trim().length > 0 && channels.size > 0 && !!effectivePersonId;

  function pickThumb(file: File | null) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast("Thumbnail must be ≤ 2 MB.");
      return;
    }
    if (customThumbUrl) URL.revokeObjectURL(customThumbUrl);
    setCustomThumb(file);
    setCustomThumbUrl(URL.createObjectURL(file));
  }

  async function addPerson() {
    const name = newPerson.name.trim();
    if (!name) return;
    setAdding(true);
    try {
      const r = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPerson),
      });
      if (!r.ok) throw new Error();
      const person = await r.json();
      await qc.invalidateQueries({ queryKey: ["options"] });
      setPersonId(person.id);
      setPersonFormOpen(false);
      setNewPerson({ name: "", email: "", label: "" });
      toast(`Person “${person.name}” added ✓`);
    } catch {
      toast("Couldn't add person.");
    } finally {
      setAdding(false);
    }
  }

  async function addPlatform() {
    const name = newPlat.trim();
    if (!name) return;
    setAdding(true);
    try {
      const r = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!r.ok) throw new Error();
      const ch = await r.json();
      await qc.invalidateQueries({ queryKey: ["options"] });
      setChannels((s) => new Set(s).add(ch.id));
      setPlatFormOpen(false);
      setNewPlat("");
      toast(`Platform “${ch.name}” added ✓`);
    } catch {
      toast("Couldn't add platform.");
    } finally {
      setAdding(false);
    }
  }

  async function commit() {
    if (!canSave || saving) return;
    setSaving(true);
    setErrors({});
    const payload = {
      title: title.trim(),
      type: category,
      source: draft.source,
      personId: effectivePersonId,
      channels: [...channels].map((id) => ({
        channelId: id,
        scheduledFor: postDates[id]
          ? new Date(postDates[id]).toISOString()
          : null,
      })),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      html: draft.html,
      url: draft.url,
      chatMessageId: draft.chatMessageId,
      filename: draft.filename,
      mimeType: draft.mimeType,
      sizeBytes: draft.sizeBytes,
    };
    const form = new FormData();
    form.set("payload", JSON.stringify(payload));
    if (customThumb) form.set("thumbnail", customThumb);
    if (draft.file) form.set("file", draft.file);

    try {
      const r = await fetch("/api/assets", { method: "POST", body: form });
      if (r.status === 422) {
        const body = await r.json();
        setErrors(body.errors || {});
        setSaving(false);
        return;
      }
      if (!r.ok) throw new Error(await r.text());
      const asset = await r.json();
      const label = TYPE_LABELS[asset.type] ?? asset.type;
      const slug = LIBRARY_SLUGS[categoryToView(asset.type)];
      toast(`Saved to ${label}s ✓`, {
        label: "View",
        onClick: () => router.push(`/${slug}`),
      });
      onSaved?.({ type: asset.type });
      qc.invalidateQueries({ queryKey: ["options"] });
      router.refresh();
      cleanup();
      close();
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Save failed.");
      setSaving(false);
    }
  }

  function cleanup() {
    if (customThumbUrl) URL.revokeObjectURL(customThumbUrl);
  }

  return (
    <Overlay onClose={() => { cleanup(); close(); }}>
      <h2 className="font-display text-[17px]">Save to library</h2>
      <p className="mb-4 text-[12.5px] text-slate">
        Tag this item so your team can filter it later.
      </p>

      {draft.fileMeta && (
        <div className="mb-3 flex items-center gap-2.5 rounded-[11px] bg-bg px-3 py-2.5 text-[12.5px]">
          <b className="truncate">{draft.filename}</b>
          <span className="text-slate">{draft.fileMeta}</span>
        </div>
      )}

      {/* Name */}
      <Field label="Name" error={errors.title}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
        />
      </Field>

      {/* Thumbnail */}
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-semibold text-slate">
          Thumbnail
        </label>
        <div className="flex items-center gap-3">
          <div className="h-[70px] w-[124px] flex-shrink-0 overflow-hidden rounded-[10px] border border-line">
            {previewImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage}
                alt="thumbnail preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="grid h-full w-full place-items-center px-2 text-center text-[10px] font-semibold leading-tight text-white"
                style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
              >
                {title || draft.title}
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
              {previewImage
                ? "Custom image · cropped to 16:9"
                : "Auto cover — or upload your own (≤ 2 MB)"}
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
      </div>

      {/* Person / creator. Admins pick any creator; everyone else is attributed
          to themselves (reassignable later via Edit). Defaults to the uploader. */}
      <Field label="Person / creator" error={errors.personId}>
        {options?.isAdmin ? (
          <>
            <div className="flex gap-2">
              <select
                value={effectivePersonId}
                onChange={(e) => setPersonId(e.target.value)}
                className="flex-1 rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
              >
                {(options?.people ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.label ? ` · ${p.label}` : ""}
                    {p.id === options?.mePersonId ? " (you)" : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setPersonFormOpen((v) => !v)}
                className="whitespace-nowrap rounded-[10px] border border-dashed border-line px-3 text-[12.5px] font-semibold text-teal-dark hover:border-teal hover:bg-teal-soft"
              >
                ＋ Add person
              </button>
            </div>
            {personFormOpen && (
              <div className="mt-2 flex flex-wrap gap-2 rounded-[11px] bg-bg p-3">
                <input
                  placeholder="Name"
                  value={newPerson.name}
                  onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                  className="flex-1 rounded-[9px] border border-line px-2.5 py-2 outline-none"
                />
                <input
                  placeholder="Role label (optional)"
                  value={newPerson.label}
                  onChange={(e) => setNewPerson({ ...newPerson, label: e.target.value })}
                  className="flex-1 rounded-[9px] border border-line px-2.5 py-2 outline-none"
                />
                <button
                  onClick={addPerson}
                  disabled={adding || !newPerson.name.trim()}
                  className="rounded-[9px] bg-teal px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2.5 rounded-[10px] border border-line bg-bg px-3 py-2.5">
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
              style={{ background: mePerson?.avatarColor ?? "#0e9f8f" }}
            >
              {initials(mePerson?.name ?? "You")}
            </span>
            <span className="font-medium">{mePerson?.name ?? "You"}</span>
            <span className="rounded-full bg-teal-soft px-1.5 py-0.5 text-[10px] font-semibold text-teal-dark">
              you
            </span>
            <span className="ml-auto text-[11px] text-slate">Change later via Edit</span>
          </div>
        )}
      </Field>

      {/* Category */}
      <Field label="Category" error={errors.type}>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`rounded-[11px] border-[1.5px] px-1 py-2.5 text-center text-[12px] font-semibold ${
                category === c.value
                  ? "border-teal bg-teal-soft text-teal-dark"
                  : "border-line text-slate hover:border-teal"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Platforms */}
      <Field label="Social platform(s)" error={errors.channels}>
        <div className="flex flex-wrap gap-2">
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
          {canEdit && (
            <button
              onClick={() => setPlatFormOpen((v) => !v)}
              className="rounded-full border-[1.5px] border-dashed border-line px-3.5 py-1.5 text-[12.5px] font-semibold text-teal-dark hover:border-teal"
            >
              ＋ Add platform
            </button>
          )}
        </div>
        {platFormOpen && (
          <div className="mt-2 flex gap-2 rounded-[11px] bg-bg p-3">
            <input
              placeholder="Platform name (e.g. Pinterest)"
              value={newPlat}
              onChange={(e) => setNewPlat(e.target.value)}
              className="flex-1 rounded-[9px] border border-line px-2.5 py-2 outline-none"
            />
            <button
              onClick={addPlatform}
              disabled={adding || !newPlat.trim()}
              className="rounded-[9px] bg-teal px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
        {channels.size > 0 && (
          <div className="mt-3 space-y-1.5 rounded-[11px] bg-bg p-3">
            <div className="text-[11px] font-semibold text-slate">
              Post date per platform (optional)
            </div>
            {(options?.channels ?? [])
              .filter((c) => channels.has(c.id))
              .map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-[12.5px]">
                  <span className="w-28 shrink-0 truncate">
                    {c.icon} {c.name}
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
      </Field>

      {/* Tags */}
      <Field label="Tags (optional)">
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="automation, q3-campaign"
          className="w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
        />
      </Field>

      <div className="mt-4 flex justify-end gap-2.5">
        <button
          onClick={() => { cleanup(); close(); }}
          className="px-3 py-2.5 font-semibold text-slate"
        >
          Cancel
        </button>
        <button
          onClick={commit}
          disabled={!canSave || saving}
          className="btn-premium rounded-[11px] px-5 py-2.5 font-semibold disabled:opacity-45 disabled:shadow-none"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Overlay>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1.5 block text-xs font-semibold text-slate">{label}</label>
      {children}
      {error && <p className="mt-1 text-[11.5px] text-[#c23b2a]">{error}</p>}
    </div>
  );
}

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4 backdrop-blur-[3px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[92vh] w-[500px] max-w-[94vw] animate-fade-up overflow-y-auto rounded-xl2 border border-white/60 bg-card p-6 shadow-lift">
        {children}
      </div>
    </div>
  );
}

function categoryToView(type: string): "IMAGE" | "THUMBNAIL" | "VIDEO" | "BLOGPOST" {
  if (type === "VIDEO_SCRIPT") return "VIDEO";
  if (type === "IMAGE" || type === "THUMBNAIL" || type === "VIDEO") return type;
  return "BLOGPOST";
}

function targetKey(t: SaveTarget): string {
  if (t.mode === "artifact") return "a:" + t.messageId;
  if (t.mode === "upload") return "u:" + t.file.tempId;
  if (t.mode === "link") return "l:" + t.link.url;
  return "e:" + t.assetId;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
