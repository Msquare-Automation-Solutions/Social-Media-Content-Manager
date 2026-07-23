"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BackButton } from "@/components/ui/back-button";
import { useToast } from "@/components/ui/toast";
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

type Filters = {
  status: string;
  person: string;
  account: string;
  channel: string;
  type: string;
  q: string;
  from: string;
  to: string;
};

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
      ...(filters.person && { person: filters.person }),
      ...(filters.account && { account: filters.account }),
      ...(filters.channel && { channel: filters.channel }),
      ...(filters.type && { type: filters.type }),
      ...(filters.q && { q: filters.q }),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to }),
    });
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const hasFilters =
    filters.status ||
    filters.person ||
    filters.account ||
    filters.channel ||
    filters.type ||
    filters.q ||
    filters.from ||
    filters.to;
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
        Grab a link, thread, or half-formed idea before it slips away. Everything here is raw
        reference, use it to create your media, then mark it <b>used</b>.
      </p>

      {canEdit && (
        <button
          onClick={() => setAddOpen(true)}
          className="btn-premium mb-1 flex w-full items-center justify-center gap-2 rounded-[12px] px-4 py-3.5 text-[14px] font-bold"
        >
          <span className="text-[18px] leading-none">＋</span> Add to bin, paste a link or jot a thought
        </button>
      )}

      {addOpen && options && (
        // Backdrop intentionally does NOT close the form — an accidental
        // outside click shouldn't discard a half-filled entry. Use ✕ / Cancel.
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-5 backdrop-blur-[3px]"
        >
          <div
            className="max-h-[88vh] w-[min(680px,100%)] overflow-y-auto rounded-xl2 border border-line bg-card p-6 shadow-card"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[18px]">Add to bin</h2>
              <button
                onClick={() => setAddOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate hover:bg-wash/[0.06]"
                title="Close"
              >
                ✕
              </button>
            </div>
            <BinForm
              options={options}
              onClose={() => setAddOpen(false)}
              onSaved={() => {
                setAddOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
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
        <FilterSelect
          label="Creator"
          value={filters.person}
          onChange={(v) => setParam("person", v)}
          options={[
            { value: "all", label: "All creators" },
            ...(options?.people ?? []).map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
        <FilterSelect
          label="Account"
          value={filters.account}
          onChange={(v) => setParam("account", v)}
          options={[
            { value: "", label: "All accounts" },
            ...(options?.accounts ?? []).map((a) => ({
              value: a.id,
              label: isImageIcon(a.icon) ? a.name : `${a.icon} ${a.name}`,
            })),
          ]}
        />
        <FilterSelect
          label="Social platform"
          value={filters.channel}
          onChange={(v) => setParam("channel", v)}
          options={[
            { value: "", label: "All platforms" },
            ...(options?.channels ?? []).map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })),
          ]}
        />
        <FilterSelect
          label="Category"
          value={filters.type}
          onChange={(v) => setParam("type", v)}
          options={[
            { value: "", label: "All categories" },
            ...CATEGORY_OPTIONS.map((c) => ({ value: c.value, label: c.label })),
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
            ? "No items match, adjust the filters."
            : "Nothing here yet, add a link or idea above."}
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
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

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

  return (
    <div
      onClick={() => setOpen(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
      className="flex cursor-pointer items-start gap-3.5 rounded-card border border-line bg-card p-4 shadow-soft transition hover:border-teal/50 hover:shadow-lift"
    >
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
        </div>

        {/* One-line summary so the row stays a constant height regardless of how
            many links/screenshots the idea has. The full list + gallery show
            when the item is opened. */}
        {(item.links.length > 0 || item.screenshots.length > 0) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-slate">
            {item.links.length > 0 && (
              <span className="truncate">
                🔗 {hostOf(item.links[0])}
                {item.links.length > 1 ? ` +${item.links.length - 1} more` : ""}
              </span>
            )}
            {item.screenshots.length > 0 && (
              <span>
                🖼 {item.screenshots.length} image{item.screenshots.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}

        {item.note && (
          <p className="mt-1.5 line-clamp-2 text-[13px] text-slate">{item.note}</p>
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
        <div
          className="flex flex-shrink-0 flex-col gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {item.status === "NEW" && (
            <button
              onClick={() => patch({ status: "USED" }, "Marked as used")}
              disabled={busy}
              className="btn-premium rounded-[9px] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50"
            >
              ✓ Mark used
            </button>
          )}
          {item.status === "USED" && (
            <button
              onClick={() => patch({ status: "NEW" }, "Marked as unused")}
              disabled={busy}
              className="rounded-[9px] border border-line px-3 py-1.5 text-[12px] font-semibold text-teal-dark hover:border-teal disabled:opacity-50"
            >
              Mark unused
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

      {open && (
        <BinItemDrawer
          item={item}
          options={options}
          channels={channels}
          accounts={accounts}
          personName={person?.name ?? item.createdBy?.name ?? "—"}
          canEdit={canEdit}
          busy={busy}
          onClose={() => setOpen(false)}
          onChanged={onChanged}
          onStatus={(s, msg) => patch({ status: s }, msg)}
          onDelete={async () => {
            await remove();
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

// Full-screen detail view of a captured idea: enlarged screenshots, every link,
// the full note, its tags/taxonomy, and the actions (mark used / discard /
// edit / delete). "Edit" swaps the body for the capture form in edit mode.
function BinItemDrawer({
  item,
  options,
  channels,
  accounts,
  personName,
  canEdit,
  busy,
  onClose,
  onChanged,
  onStatus,
  onDelete,
}: {
  item: ContentBinRow;
  options?: Options;
  channels: { id: string; name: string; icon: string; color: string }[];
  accounts: { id: string; name: string; icon: string; color: string }[];
  personName: string;
  canEdit: boolean;
  busy: boolean;
  onClose: () => void;
  onChanged: () => void;
  onStatus: (status: string, msg: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (!editing) onClose();
      }}
      className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-5 backdrop-blur-[3px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-[min(680px,100%)] overflow-y-auto rounded-xl2 border border-line bg-card p-6 shadow-card"
      >
        {editing && options ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[18px]">Edit idea</h2>
              <button
                onClick={() => setEditing(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate hover:bg-wash/[0.06]"
                title="Close"
              >
                ✕
              </button>
            </div>
            <BinForm
              options={options}
              item={item}
              onClose={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                onChanged();
              }}
            />
          </>
        ) : (
          <BinDetail
            item={item}
            channels={channels}
            accounts={accounts}
            personName={personName}
            canEdit={canEdit}
            busy={busy}
            onClose={onClose}
            onEdit={() => setEditing(true)}
            onStatus={onStatus}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  );
}

function BinDetail({
  item,
  channels,
  accounts,
  personName,
  canEdit,
  busy,
  onClose,
  onEdit,
  onStatus,
  onDelete,
}: {
  item: ContentBinRow;
  channels: { id: string; name: string; icon: string; color: string }[];
  accounts: { id: string; name: string; icon: string; color: string }[];
  personName: string;
  canEdit: boolean;
  busy: boolean;
  onClose: () => void;
  onEdit: () => void;
  onStatus: (status: string, msg: string) => void;
  onDelete: () => void;
}) {
  const { toast } = useToast();
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const longNote = item.note.length > 320;
  const shots = item.screenshots;
  async function copyNote() {
    try {
      await navigator.clipboard.writeText(item.note);
      toast("Note copied ✓");
    } catch {
      toast("Couldn’t copy the note.");
    }
  }
  return (
    <>
        <div className="mb-3 flex items-start gap-3">
          <h2 className="flex-1 font-display text-[19px] leading-tight">{item.title}</h2>
          <StatusChip status={item.status} />
          <button
            onClick={onClose}
            className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-slate hover:bg-wash/[0.06]"
            title="Close"
          >
            ✕
          </button>
        </div>

        {item.note && (
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-3">
              <div className="text-[11.5px] font-extrabold uppercase tracking-[0.07em] text-ink">Note</div>
              <button
                onClick={copyNote}
                className="rounded-[7px] border border-line px-2 py-0.5 text-[11px] font-semibold text-teal-dark transition hover:border-teal hover:bg-teal-soft"
              >
                ⧉ Copy
              </button>
              {longNote && (
                <button
                  onClick={() => setNoteExpanded((v) => !v)}
                  className="rounded-[7px] border border-line px-2 py-0.5 text-[11px] font-semibold text-teal-dark transition hover:border-teal hover:bg-teal-soft"
                >
                  {noteExpanded ? "▴ Collapse" : "▾ Expand"}
                </button>
              )}
            </div>
            {/* Document-style surface: a padded "page". A long note stays
                collapsed with a fade so screenshots/links below stay reachable;
                click the note (or the toggle) to expand to the full doc. */}
            <div
              onClick={() => longNote && !noteExpanded && setNoteExpanded(true)}
              className={`relative rounded-[12px] border border-line bg-bg/50 px-7 py-6 shadow-soft ${
                longNote && !noteExpanded ? "cursor-pointer" : ""
              }`}
            >
              <p
                className={`whitespace-pre-wrap text-[15px] leading-[1.8] text-ink ${
                  longNote && !noteExpanded ? "max-h-[220px] overflow-hidden" : ""
                }`}
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {item.note}
              </p>
              {longNote && !noteExpanded && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-24 items-end justify-center rounded-b-[12px] bg-gradient-to-t from-card via-card/80 to-transparent pb-2">
                  <span className="text-[12px] font-semibold text-teal-dark">Click to read full note ▾</span>
                </div>
              )}
            </div>
            {longNote && noteExpanded && (
              <button
                onClick={() => setNoteExpanded(false)}
                className="mt-2 text-[12px] font-semibold text-teal-dark hover:underline"
              >
                ▴ Show less
              </button>
            )}
          </div>
        )}

        {shots.length > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.07em] text-ink">
              Screenshots <span className="text-slate">({shots.length})</span>
            </div>
            {/* A single collection tile, opens the full gallery. Keeps the
                panel a fixed, compact height no matter how many screenshots. */}
            <button
              onClick={() => setGalleryOpen(true)}
              title="Open gallery"
              className="group relative h-28 w-44 overflow-hidden rounded-[11px] border border-line transition hover:ring-2 hover:ring-teal/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shots[0]} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition group-hover:opacity-100">
                <span className="rounded-full bg-black/60 px-3 py-1 text-[12px] font-semibold text-white">
                  View gallery
                </span>
              </div>
              <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                ▦ {shots.length} {shots.length === 1 ? "image" : "images"}
              </span>
            </button>
          </div>
        )}

        {item.links.length > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.07em] text-ink">
              Reference links
            </div>
            <div className="flex flex-col gap-1">
              {item.links.map((l, i) => (
                <a
                  key={i}
                  href={l.startsWith("http") ? l : `https://${l}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-[13px] text-teal-dark hover:underline"
                >
                  🔗 {l}
                </a>
              ))}
            </div>
          </div>
        )}

        {galleryOpen && shots.length > 0 && (
          <GalleryModal images={shots} onClose={() => setGalleryOpen(false)} />
        )}

        <div className="mb-5 flex flex-wrap items-center gap-1.5">
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

        <div className="flex items-center gap-2 border-t border-line pt-4">
          <span className="text-[11.5px] text-slate">
            Added by {personName} · {new Date(item.createdAt).toLocaleDateString()}
          </span>
          {canEdit && (
            <div className="ml-auto flex flex-wrap justify-end gap-2">
              <button
                onClick={onEdit}
                disabled={busy}
                className="rounded-[9px] border border-line px-3.5 py-1.5 text-[12.5px] font-semibold text-ink hover:border-teal disabled:opacity-50"
              >
                Edit
              </button>
              {item.status === "NEW" && (
                <button
                  onClick={() => onStatus("USED", "Marked as used")}
                  disabled={busy}
                  className="btn-premium rounded-[9px] px-3.5 py-1.5 text-[12.5px] font-semibold disabled:opacity-50"
                >
                  ✓ Mark used
                </button>
              )}
              {item.status === "USED" && (
                <button
                  onClick={() => onStatus("NEW", "Marked as unused")}
                  disabled={busy}
                  className="rounded-[9px] border border-line px-3.5 py-1.5 text-[12.5px] font-semibold text-teal-dark hover:border-teal disabled:opacity-50"
                >
                  Mark unused
                </button>
              )}
              {item.status === "NEW" && (
                <button
                  onClick={() => onStatus("DISCARDED", "Moved to discarded")}
                  disabled={busy}
                  className="rounded-[9px] border border-line px-3.5 py-1.5 text-[12.5px] font-semibold text-slate hover:border-teal disabled:opacity-50"
                >
                  Discard
                </button>
              )}
              {item.status === "DISCARDED" && (
                <button
                  onClick={() => onStatus("NEW", "Restored to bin")}
                  disabled={busy}
                  className="rounded-[9px] border border-line px-3.5 py-1.5 text-[12.5px] font-semibold text-teal-dark hover:border-teal disabled:opacity-50"
                >
                  Restore
                </button>
              )}
              <button
                onClick={onDelete}
                disabled={busy}
                className="rounded-[9px] border border-line px-3.5 py-1.5 text-[12.5px] font-semibold text-[#c23b2a] hover:border-[#c23b2a] disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
    </>
  );
}

// Two-level gallery: opens to a grid of every screenshot; click one to expand
// it to a full-screen single view with prev/next. Esc / back returns to the
// grid, then closes.
function GalleryModal({ images, onClose }: { images: string[]; onClose: () => void }) {
  const [active, setActive] = useState<number | null>(null);
  const go = (delta: number) =>
    setActive((i) => (i === null ? i : (i + delta + images.length) % images.length));
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (active === null) onClose();
        else setActive(null);
      } else if (active !== null && e.key === "ArrowRight") go(1);
      else if (active !== null && e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Single-image view.
  if (active !== null) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setActive(null);
        }}
        className="fixed inset-0 z-[90] grid place-items-center bg-black/90 p-6"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActive(null);
          }}
          className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-white/20"
          title="Back to gallery"
        >
          ‹ Gallery
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          title="Close"
        >
          ✕
        </button>
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-[20px] text-white hover:bg-white/20"
              title="Previous"
            >
              ‹
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-[20px] text-white hover:bg-white/20"
              title="Next"
            >
              ›
            </button>
          </>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[active]}
          alt=""
          onClick={(e) => e.stopPropagation()}
          className="max-h-[88vh] max-w-[92vw] rounded-[10px] object-contain shadow-card"
        />
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white tabular-nums">
          {active + 1} / {images.length}
        </div>
      </div>
    );
  }

  // Grid view (default).
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-[min(920px,95vw)] overflow-y-auto rounded-xl2 border border-line bg-card p-6 shadow-card"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[18px]">
            Gallery <span className="text-slate">({images.length})</span>
          </h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-slate hover:bg-wash/[0.06]"
            title="Close"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {images.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              title="Expand image"
              className="aspect-video overflow-hidden rounded-[10px] border border-line transition hover:ring-2 hover:ring-teal/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
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

// ── Capture / edit form ──────────────────────────────────────────────────────
// Doubles as the quick-add form (no `item`) and the edit form (`item` given →
// PATCHes instead of POSTing).
function BinForm({
  options,
  item,
  onClose,
  onSaved,
}: {
  options: Options;
  item?: ContentBinRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [links, setLinks] = useState<string[]>(item && item.links.length ? item.links : [""]);
  const [title, setTitle] = useState(item?.title ?? "");
  const [tags, setTags] = useState(item ? item.tags.join(", ") : "");
  const [personId, setPersonId] = useState(
    item?.personId ?? options.mePersonId ?? options.people[0]?.id ?? "",
  );
  const [category, setCategory] = useState(item?.category ?? "");
  const [channelIds, setChannelIds] = useState<Set<string>>(new Set(item?.channelIds ?? []));
  const [accountIds, setAccountIds] = useState<Set<string>>(new Set(item?.accountIds ?? []));
  const [note, setNote] = useState(item?.note ?? "");
  const [screenshots, setScreenshots] = useState<string[]>(item?.screenshots ?? []);
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
    const r = await fetch(item ? `/api/content-bin/${item.id}` : "/api/content-bin", {
      method: item ? "PATCH" : "POST",
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
      toast(item ? "Changes saved ✓" : "Added to bin ✓");
      onSaved();
    } else {
      toast("Couldn’t save. Check the fields and try again.");
    }
  }

  const labelCls = "flex flex-col gap-1 text-[11.5px] font-semibold text-slate";
  const inputCls =
    "rounded-[10px] border border-line bg-card px-3 py-2.5 font-normal text-ink outline-none focus:border-teal";

  return (
    <div className="grid grid-cols-2 gap-3.5">
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
      <div className={`col-span-2 ${labelCls}`}>
        Category <span className="font-normal text-slate">(pick one)</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((c) => (
            <Chip
              key={c.value}
              on={category === c.value}
              onClick={() => setCategory((cur) => (cur === c.value ? "" : c.value))}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </div>

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
        <span className="font-normal text-slate">(optional, add several; the first is the cover)</span>
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
          className={`min-h-[140px] resize-y text-[14px] leading-relaxed ${inputCls}`}
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
          {saving ? "Saving…" : item ? "Save changes" : "Add to bin"}
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
