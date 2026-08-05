"use client";

import { useEffect, useState } from "react";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { StatusBadge } from "@/components/library/status-badge";
import { initials } from "@/lib/colors";

type Detail = {
  id: string;
  title: string;
  type: string;
  source: string; // UPLOAD | GENERATED | LINK
  status: string;
  url: string | null;
  html: string | null;
  filename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  note: string | null;
  tags: string[];
  createdAt: string;
  uploadedBy: string | null;
  person: { id: string; name: string; avatarColor: string };
  channels: { id: string; name: string; icon: string; color: string; scheduledFor: string | null }[];
  accounts: { id: string; name: string; icon: string; color: string }[];
  files: { id: string; url: string; filename: string | null; mimeType: string | null; thumbnailUrl: string | null }[];
};

function fmtBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} KB`;
  return `${n} B`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1.5">
      <dt className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.05em] text-slate">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-1.5 text-[12.5px] text-ink">{children}</dd>
    </div>
  );
}

const pill = "inline-flex items-center gap-1.5 rounded-full bg-wash/[0.06] px-2 py-0.5 text-[12px]";

/**
 * View a submitted file without leaving the page — so a reviewer can read the
 * copy or watch the cut, and see who it's for and where it's going, right inside
 * the review queue instead of bouncing to the library and back.
 */
export function FilePreview({ assetId, onClose }: { assetId: string; onClose: () => void }) {
  const [a, setA] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);
  // Metadata is on demand — the file itself is what a reviewer came to see.
  const [showMeta, setShowMeta] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetch(`/api/assets/${assetId}`);
      if (!alive) return;
      if (r.ok) setA(await r.json());
      else setMissing(true);
    })();
    return () => {
      alive = false;
    };
  }, [assetId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // An external reference (Drive/YouTube/any URL) — there's no file to render,
  // so the useful action is opening it.
  const isLink = a?.source === "LINK" && !!a.url;
  const isImage = a?.mimeType?.startsWith("image/");
  const isVideo = a?.mimeType?.startsWith("video/");
  const isPdf = a?.mimeType === "application/pdf";

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/70 p-5 backdrop-blur-[3px]">
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-[min(880px,96vw)] overflow-y-auto rounded-xl2 border border-line bg-card p-5 shadow-lift"
      >
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 truncate font-display text-[17px]">{a?.title ?? "Loading…"}</h2>
              {a && <StatusBadge status={a.status} />}
            </div>
            {a && (
              <p className="mt-0.5 truncate text-[12px] text-slate">
                {isLink
                  ? a.url
                  : `${a.filename ?? "—"}${a.mimeType ? ` · ${a.mimeType}` : ""}${a.sizeBytes != null ? ` · ${fmtBytes(a.sizeBytes)}` : ""}`}
              </p>
            )}
          </div>
          {a && (
            <button
              onClick={() => setShowMeta((v) => !v)}
              aria-expanded={showMeta}
              className={`shrink-0 rounded-[9px] border px-3 py-1.5 text-[12px] font-semibold ${showMeta ? "border-teal bg-teal-soft text-teal-dark" : "border-line text-slate hover:border-teal hover:text-teal-dark"}`}
            >
              Details {showMeta ? "▴" : "▾"}
            </button>
          )}
          {a && isLink ? (
            <a
              href={a.url!}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-premium shrink-0 rounded-[9px] px-3 py-1.5 text-[12px] font-semibold"
            >
              Open link ↗
            </a>
          ) : a ? (
            <a
              href={`/api/assets/${a.id}/download`}
              className="shrink-0 rounded-[9px] border border-line px-3 py-1.5 text-[12px] font-semibold text-teal-dark hover:border-teal"
            >
              ↓ Download
            </a>
          ) : null}
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate hover:bg-wash/[0.06]"
            title="Close"
          >
            ✕
          </button>
        </div>

        {missing ? (
          <div className="grid place-items-center py-16 text-center text-[13px] text-slate">
            This file is no longer here — it may have been deleted or replaced.
          </div>
        ) : !a ? (
          <div className="grid place-items-center py-16 text-[13px] text-slate">Loading…</div>
        ) : (
          <>
            <div className="relative">
            {/* Preview */}
            {isLink ? (
              <div className="grid place-items-center gap-3 rounded-[12px] border border-line bg-wash/[0.03] py-14 text-center">
                <div className="text-[13px] font-semibold text-ink">External link</div>
                <a
                  href={a.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="max-w-[80%] truncate text-[12.5px] text-teal-dark underline"
                >
                  {a.url}
                </a>
                <a
                  href={a.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-premium rounded-[10px] px-4 py-2 text-[12.5px] font-semibold"
                >
                  Open in a new window ↗
                </a>
              </div>
            ) : isVideo && a.url ? (
              <video src={a.url} controls className="mx-auto max-h-[58vh] w-auto max-w-full rounded-[12px] bg-black" />
            ) : isImage && a.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.url} alt={a.title} className="mx-auto max-h-[58vh] w-auto max-w-full rounded-[12px] object-contain" />
            ) : a.html ? (
              <article
                className="prose max-h-[58vh] max-w-none overflow-y-auto rounded-[12px] border border-line p-5 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-lg [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:mb-2 [&_p]:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: a.html }}
              />
            ) : isPdf ? (
              <iframe
                src={`/api/assets/${a.id}/download?inline=1`}
                title={a.title}
                className="h-[58vh] w-full rounded-[12px] border border-line bg-white"
              />
            ) : (
              <div className="grid place-items-center gap-2 rounded-[12px] border border-line bg-wash/[0.03] py-14 text-center">
                <div className="text-[13px] font-semibold text-ink">
                  {(a.filename?.match(/\.([a-z0-9]+)$/i)?.[1] ?? "This file").toUpperCase()} can’t preview here
                </div>
                <div className="text-[12px] text-slate">Download it to view.</div>
              </div>
            )}

            {/* Everything about the item, on demand — a compact card over the
                top-right of the preview so it never pushes the layout around. */}
            {showMeta && (
            <dl className="absolute right-2 top-2 max-h-[calc(100%-1rem)] w-[320px] max-w-[calc(100%-1rem)] overflow-y-auto rounded-[12px] border border-line bg-card/95 p-3 shadow-lift backdrop-blur-sm">
              <Row label="Person">
                <span
                  className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-white"
                  style={{ background: a.person.avatarColor }}
                >
                  {initials(a.person.name)}
                </span>
                {a.person.name}
              </Row>
              <Row label="Platforms">
                {a.channels.length === 0 ? (
                  <span className="text-slate">—</span>
                ) : (
                  a.channels.map((c) => (
                    <span key={c.id} className={pill}>
                      <PlatformIcon name={c.name} icon={c.icon} size={13} />
                      {c.name}
                      {c.scheduledFor && (
                        <span className="text-teal-dark">
                          · {new Date(c.scheduledFor).toLocaleDateString()}
                        </span>
                      )}
                    </span>
                  ))
                )}
              </Row>
              <Row label="Accounts">
                {a.accounts.length === 0 ? (
                  <span className="text-slate">—</span>
                ) : (
                  a.accounts.map((ac) => (
                    <span key={ac.id} className={pill}>
                      <PlatformIcon name={ac.name} icon={ac.icon} size={13} />
                      {ac.name}
                    </span>
                  ))
                )}
              </Row>
              {a.tags.length > 0 && (
                <Row label="Tags">
                  {a.tags.map((t) => (
                    <span key={t} className="rounded-full bg-bg px-2 py-0.5 text-[11px]">
                      #{t}
                    </span>
                  ))}
                </Row>
              )}
              <Row label="Source">
                {a.source === "GENERATED" ? "AI generated" : a.source === "LINK" ? "External link" : "Upload"}
              </Row>
              {a.uploadedBy && <Row label="Uploaded by">{a.uploadedBy}</Row>}
              {!isLink && a.filename && <Row label="File">{a.filename}</Row>}
              {!isLink && a.mimeType && <Row label="Type">{a.mimeType}</Row>}
              {!isLink && a.sizeBytes != null && <Row label="Size">{fmtBytes(a.sizeBytes)}</Row>}
              <Row label="Created">{new Date(a.createdAt).toLocaleString()}</Row>
            </dl>
            )}
            </div>

            {/* The description can be long (a whole slide script), so it gets its
                own panel: readable measure, comfortable leading, scroll cap. */}
            {a.note && (
              <div className="mt-4 rounded-[12px] border border-line bg-bg p-4">
                <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate">
                  Description
                </div>
                <p className="max-h-[26vh] max-w-[72ch] overflow-y-auto whitespace-pre-wrap text-[13px] leading-[1.7] text-ink">
                  {a.note}
                </p>
              </div>
            )}

            {/* Extra parts bundled into this one item. */}
            {a.files.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.06em] text-ink">
                  Also in this file ({a.files.length})
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {a.files.map((f) => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="overflow-hidden rounded-[10px] border border-line bg-wash/[0.03]"
                    >
                      {f.mimeType?.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.thumbnailUrl ?? f.url} alt={f.filename ?? ""} className="h-[74px] w-full object-cover" />
                      ) : (
                        <span className="grid h-[74px] w-full place-items-center bg-wash/[0.06] text-[11px] font-bold text-slate">
                          {(f.filename?.match(/\.([a-z0-9]+)$/i)?.[1] ?? "FILE").toUpperCase()}
                        </span>
                      )}
                      <span className="block truncate px-2 py-1.5 text-[11px]">{f.filename ?? "File"}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
