"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BackButton } from "@/components/ui/back-button";
import { useToast } from "@/components/ui/toast";
import { useSaveDialog } from "@/components/save/dialog-context";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { uploadToStorage } from "@/lib/upload-client";
import { CATEGORY_OPTIONS, TYPE_LABELS } from "@/lib/library";
import { BIN_STATUSES, BIN_STATUS_LABELS } from "@/lib/enums";
import type { ContentBinRow } from "@/lib/data";

type Options = {
  people: { id: string; name: string; label?: string | null; avatarColor: string }[];
  channels: { id: string; name: string; icon: string; color: string }[];
  accounts: { id: string; name: string; icon: string; color: string }[];
  canEdit: boolean;
  mePersonId: string | null;
  isAdmin: boolean;
};

type Filters = { status: string; q: string; from: string; to: string };

const isImageIcon = (v: string) => /^(https?:\/\/|\/)/.test(v);
const hostOf = (u: string) => {
  try {
    return new URL(u.startsWith("http") ? u : `https://${u}`).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

export function ContentBinView({
  items,
  canEdit,
  filters,
}: {
  items: ContentBinRow[];
  canEdit: boolean;
  filters: Filters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);

  const { data: options } = useQuery<Options>({
    queryKey: ["options"],
    queryFn: async () => {
      const r = await fetch("/api/options");
      if (!r.ok) throw new Error("Failed to load options");
      return r.json();
    },
  });

  function setParam(key: string, value: string) {
    const params = new URLSearchParams({
      ...(filters.status && { status: filters.status }),
      ...(filters.q && { q: filters.q }),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to }),
    });
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const hasFilters = filters.status || filters.q || filters.from || filters.to;
  const live = items.filter((i) => i.status !== "DISCARDED").length;

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-1.5 flex items-center gap-3.5">
        <BackButton />
        <h2 className="font-display text-[19px]">Content Bin</h2>
        {live > 0 && (
          <span className="rounded-full bg-teal-soft px-2.5 py-0.5 text-[12px] font-bold text-teal-dark tabular-nums">
            {live}
          </span>
        )}
        {pending && <span className="text-[12px] text-slate">Loading…</span>}
      </div>
      <p className="mb-4 max-w-[64ch] text-[13px] text-slate">
        Grab a link, thread, or half-formed idea before it slips away. Everything here is raw — when
        one’s ready, <b>Promote</b> it into a real asset and it flows into your library.
      </p>

      {canEdit && !addOpen && (
        <button
          onClick={() => setAddOpen(true)}
          className="w-full rounded-[12px] border border-dashed border-line px-4 py-3 text-left text-[13px] font-semibold text-teal-dark transition hover:border-teal hover:bg-teal-soft"
        >
          ＋ Add to bin — paste a link or jot a thought
        </button>
      )}

      {addOpen && options && (
        <AddBinForm
          options={options}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            router.refresh();
          }}
        />
      )}

      {/* Filter bar */}
      <div className="mb-4 mt-5 flex flex-wrap items-end gap-2.5">
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(v) => setParam("status", v)}
          options={[
            { value: "", label: "All statuses" },
            ...BIN_STATUSES.map((s) => ({ value: s, label: BIN_STATUS_LABELS[s] })),
          ]}
        />
        <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-slate">
          From
          <input
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => setParam("from", e.target.value)}
            className="rounded-[11px] border border-line bg-card px-3 py-2.5 font-normal text-ink outline-none focus:border-teal"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-slate">
          To
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => setParam("to", e.target.value)}
            className="rounded-[11px] border border-line bg-card px-3 py-2.5 font-normal text-ink outline-none focus:border-teal"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-slate">
          Search
          <input
            defaultValue={filters.q}
            onKeyDown={(e) => {
              if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value);
            }}
            onBlur={(e) => filters.q !== e.target.value && setParam("q", e.target.value)}
            placeholder="Title, note or link…"
            className="rounded-[11px] border border-line bg-card px-3 py-2.5 font-normal text-ink outline-none focus:border-teal"
          />
        </label>
        {hasFilters && (
          <button
            onClick={() => startTransition(() => router.push(pathname))}
            className="self-end px-1 py-2.5 text-[12.5px] font-semibold text-teal-dark"
          >
            Clear filters
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="grid place-items-center py-20 text-center text-slate">
          {hasFilters
            ? "No items match — adjust the filters."
            : "Nothing here yet — add a link or idea above."}
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-24">
          {items.map((it) => (
            <BinItemRow
              key={it.id}
              item={it}
              options={options}
              canEdit={canEdit}
              onChanged={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-slate">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[11px] border border-line bg-card px-3 py-2.5 font-normal text-ink outline-none focus:border-teal"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── A single captured idea ───────────────────────────────────────────────────
function BinItemRow({
  item,
  options,
  canEdit,
  onChanged,
}: {
  item: ContentBinRow;
  options?: Options;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const { openPromote } = useSaveDialog();
  const [busy, setBusy] = useState(false);

  const channels = (options?.channels ?? []).filter((c) => item.channelIds.includes(c.id));
  const accounts = (options?.accounts ?? []).filter((a) => item.accountIds.includes(a.id));
  const person = options?.people.find((p) => p.id === item.personId);
  const cover = item.screenshots[0];

  async function patch(body: Record<string, unknown>, msg: string) {
    setBusy(true);
    const r = await fetch(`/api/content-bin/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (r.ok) {
      toast(msg);
      onChanged();
    } else {
      toast("Couldn’t update this item.");
    }
  }

  async function remove() {
    if (!confirm(`Delete “${item.title}” from the bin? It moves to Trash (30-day restore).`)) return;
    setBusy(true);
    const r = await fetch(`/api/content-bin/${item.id}`, { method: "DELETE" });
    setBusy(false);
    if (r.ok) {
      toast("Deleted");
      onChanged();
    } else {
      toast("Couldn’t delete this item.");
    }
  }

  function promote() {
    openPromote(
      {
        binItemId: item.id,
        title: item.title,
        links: item.links,
        note: item.note,
        tags: item.tags,
        personId: item.personId,
        category: item.category,
        channelIds: item.channelIds,
        accountIds: item.accountIds,
        screenshots: item.screenshots,
      },
      async (saved) => {
        await fetch(`/api/content-bin/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "USED", promotedAssetId: saved.id }),
        });
        onChanged();
      },
    );
  }

  return (
    <div className="flex items-start gap-3.5 rounded-card border border-line bg-card p-4 shadow-soft">
      <div className="grid h-14 w-14 flex-shrink-0 place-items-center overflow-hidden rounded-[11px] bg-wash/[0.05] text-[20px]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : item.links.length ? (
          "🔗"
        ) : (
          "💡"
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-semibold">{item.title}</h3>
          <StatusChip status={item.status} />
          {item.promotedAssetId && item.status === "USED" && (
            <span className="rounded-full bg-violet-soft px-2 py-0.5 text-[10.5px] font-semibold text-violet">
              → in library
            </span>
          )}
        </div>

        {item.links.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5">
            {item.links.map((l, i) => (
              <a
                key={i}
                href={l.startsWith("http") ? l : `https://${l}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-[12px] text-teal-dark hover:underline"
              >
                🔗 {hostOf(l)}
              </a>
            ))}
          </div>
        )}

        {item.note && <p className="mt-1.5 text-[13px] text-slate">{item.note}</p>}

        {item.screenshots.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.screenshots.slice(1).map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={s}
                alt=""
                className="h-11 w-16 rounded-[7px] border border-line object-cover"
              />
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.category && (
            <span className="rounded-full bg-violet-soft px-2 py-0.5 text-[11px] font-semibold text-violet">
              {TYPE_LABELS[item.category] ?? item.category}
            </span>
          )}
          {accounts.map((a) => (
            <span
              key={a.id}
              className="flex items-center gap-1 rounded-full bg-teal-soft px-2 py-0.5 text-[11px] font-semibold text-teal-dark"
            >
              {!isImageIcon(a.icon) && <PlatformIcon name={a.name} icon={a.icon} size={12} />}
              {a.name}
            </span>
          ))}
          {channels.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1 rounded-full bg-wash/[0.06] px-2 py-0.5 text-[11px] font-semibold text-ink"
            >
              <PlatformIcon name={c.name} icon={c.icon} size={12} /> {c.name}
            </span>
          ))}
          {item.tags.map((t) => (
            <span key={t} className="rounded-[7px] bg-wash/[0.05] px-2 py-0.5 text-[11px] text-slate">
              #{t}
            </span>
          ))}
        </div>

        <div className="mt-2 text-[11.5px] text-slate">
          Added by {person?.name ?? item.createdBy?.name ?? "—"} ·{" "}
          {new Date(item.createdAt).toLocaleDateString()}
        </div>
      </div>

      {canEdit && (
        <div className="flex flex-shrink-0 flex-col gap-2">
          {item.status !== "USED" && (
            <button
              onClick={promote}
              disabled={busy}
              className="btn-premium rounded-[9px] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50"
            >
              Promote →
            </button>
          )}
          {item.status === "NEW" && (
            <button
              onClick={() => patch({ status: "DISCARDED" }, "Moved to discarded")}
              disabled={busy}
              className="rounded-[9px] border border-line px-3 py-1.5 text-[12px] font-semibold text-slate hover:border-teal disabled:opacity-50"
            >
              Discard
            </button>
          )}
          {item.status === "DISCARDED" && (
            <button
              onClick={() => patch({ status: "NEW" }, "Restored to bin")}
              disabled={busy}
              className="rounded-[9px] border border-line px-3 py-1.5 text-[12px] font-semibold text-teal-dark hover:border-teal disabled:opacity-50"
            >
              Restore
            </button>
          )}
          <button
            onClick={remove}
            disabled={busy}
            className="rounded-[9px] border border-line px-3 py-1.5 text-[12px] font-semibold text-[#c23b2a] hover:border-[#c23b2a] disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    NEW: "bg-teal-soft text-teal-dark",
    USED: "bg-violet-soft text-violet",
    DISCARDED: "bg-wash/[0.06] text-slate",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.04em] ${
        map[status] ?? "bg-wash/[0.06] text-slate"
      }`}
    >
      {BIN_STATUS_LABELS[status as keyof typeof BIN_STATUS_LABELS] ?? status}
    </span>
  );
}

// ── Quick-add capture form ───────────────────────────────────────────────────
function AddBinForm({
  options,
  onClose,
  onSaved,
}: {
  options: Options;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [links, setLinks] = useState<string[]>([""]);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [personId, setPersonId] = useState(options.mePersonId ?? options.people[0]?.id ?? "");
  const [category, setCategory] = useState("");
  const [channelIds, setChannelIds] = useState<Set<string>>(new Set());
  const [accountIds, setAccountIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const shotInput = useRef<HTMLInputElement>(null);

  function setLink(i: number, v: string) {
    setLinks((ls) => ls.map((l, idx) => (idx === i ? v : l)));
    if (i === 0 && v.trim() && !title) setTitle(`From ${hostOf(v.trim())}`);
  }

  async function addFiles(files: FileList | File[] | null | undefined) {
    const imgs = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setUploading(true);
    try {
      for (const f of imgs) {
        if (f.size > 10 * 1024 * 1024) {
          toast("Each screenshot must be ≤ 10 MB.");
          continue;
        }
        const url = await uploadToStorage(f);
        setScreenshots((s) => [...s, url]);
      }
    } catch {
      toast("Couldn’t upload an image.");
    } finally {
      setUploading(false);
    }
  }

  // Paste an image straight into the open form (adds to the gallery).
  const addFilesRef = useRef(addFiles);
  useEffect(() => {
    addFilesRef.current = addFiles;
  });
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const img = Array.from(e.clipboardData?.items ?? []).find((it) =>
        it.type.startsWith("image/"),
      );
      const f = img?.getAsFile();
      if (f) {
        e.preventDefault();
        void addFilesRef.current([f]);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function toggle(set: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    set((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function save() {
    if (!title.trim() || saving) return;
    setSaving(true);
    const r = await fetch("/api/content-bin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        note: note.trim(),
        links: links.map((l) => l.trim()).filter(Boolean),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        personId: personId || null,
        category: category || null,
        channelIds: [...channelIds],
        accountIds: [...accountIds],
        screenshots,
      }),
    });
    setSaving(false);
    if (r.ok) {
      toast("Added to bin ✓");
      onSaved();
    } else {
      toast("Couldn’t save. Check the fields and try again.");
    }
  }

  const labelCls = "flex flex-col gap-1 text-[11.5px] font-semibold text-slate";
  const inputCls =
    "rounded-[10px] border border-line bg-card px-3 py-2.5 font-normal text-ink outline-none focus:border-teal";

  return (
    <div className="mt-2 grid grid-cols-2 gap-3.5 rounded-card border border-line bg-card p-4 shadow-soft">
      {/* Links */}
      <div className={`col-span-2 ${labelCls}`}>
        Reference links <span className="font-normal text-slate">(add as many as you like)</span>
        <div className="mt-1 flex flex-col gap-2">
          {links.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={l}
                onChange={(e) => setLink(i, e.target.value)}
                placeholder="https://…"
                className={`flex-1 ${inputCls}`}
              />
              {links.length > 1 && (
                <button
                  onClick={() => setLinks((ls) => ls.filter((_, idx) => idx !== i))}
                  className="rounded-[9px] border border-line px-3 py-2.5 text-slate hover:border-[#c23b2a] hover:text-[#c23b2a]"
                  title="Remove link"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => setLinks((ls) => [...ls, ""])}
          className="mt-2 self-start rounded-[9px] border border-line px-3 py-1.5 text-[12px] font-semibold text-teal-dark hover:border-teal"
        >
          ＋ Add link
        </button>
      </div>

      <label className={labelCls}>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} autoFocus />
      </label>
      <label className={labelCls}>
        Tags
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="hook, reel-idea, competitor"
          className={inputCls}
        />
      </label>

      <label className={labelCls}>
        Creator
        <select value={personId} onChange={(e) => setPersonId(e.target.value)} className={inputCls}>
          {options.people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className={labelCls}>
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
          <option value="">— none yet —</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <div className={`col-span-2 ${labelCls}`}>
        Account <span className="font-normal text-slate">(one or more)</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {options.accounts.map((a) => (
            <Chip
              key={a.id}
              on={accountIds.has(a.id)}
              onClick={() => toggle(setAccountIds, a.id)}
            >
              {!isImageIcon(a.icon) && <PlatformIcon name={a.name} icon={a.icon} size={13} />} {a.name}
            </Chip>
          ))}
          {options.accounts.length === 0 && <span className="text-[12px] text-slate">No accounts yet.</span>}
        </div>
      </div>

      <div className={`col-span-2 ${labelCls}`}>
        Social platform <span className="font-normal text-slate">(one or more)</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {options.channels.map((c) => (
            <Chip key={c.id} on={channelIds.has(c.id)} onClick={() => toggle(setChannelIds, c.id)}>
              <PlatformIcon name={c.name} icon={c.icon} size={13} /> {c.name}
            </Chip>
          ))}
        </div>
      </div>

      {/* Screenshots */}
      <div className={`col-span-2 ${labelCls}`}>
        Screenshots{" "}
        <span className="font-normal text-slate">(optional — add several; the first is the cover)</span>
        <div className="mt-1 flex flex-wrap items-start gap-2">
          {screenshots.map((s, i) => (
            <div key={i} className="relative h-[52px] w-[76px] overflow-hidden rounded-[10px] border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[9px] tracking-wide text-white">
                  cover
                </span>
              )}
              <button
                onClick={() => setScreenshots((ss) => ss.filter((_, idx) => idx !== i))}
                className="absolute right-0.5 top-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-black/60 text-[11px] text-white"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => shotInput.current?.click()}
            disabled={uploading}
            className="rounded-[9px] border border-line px-3 py-2.5 text-[12px] font-semibold text-teal-dark hover:border-teal disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload / paste image(s)"}
          </button>
          <input
            ref={shotInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>
      </div>

      <label className={`col-span-2 ${labelCls}`}>
        Note
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why it caught your eye, what to do with it…"
          className={`min-h-[52px] resize-y ${inputCls}`}
        />
      </label>

      <div className="col-span-2 flex justify-end gap-2.5">
        <button onClick={onClose} className="px-2 py-2 text-[12.5px] font-semibold text-slate">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!title.trim() || saving || uploading}
          className="btn-premium rounded-[10px] px-4 py-2 text-[12.5px] font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add to bin"}
        </button>
      </div>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-normal transition ${
        on
          ? "border-teal bg-teal-soft font-semibold text-teal-dark"
          : "border-line bg-bg text-ink hover:border-teal"
      }`}
    >
      {children}
    </button>
  );
}
