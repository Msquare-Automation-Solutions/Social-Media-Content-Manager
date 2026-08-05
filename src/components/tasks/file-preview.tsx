"use client";

import { useEffect, useState } from "react";

type Detail = {
  id: string;
  title: string;
  type: string;
  source: string; // UPLOAD | GENERATED | LINK
  url: string | null;
  html: string | null;
  filename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  note: string | null;
  files: { id: string; url: string; filename: string | null; mimeType: string | null; thumbnailUrl: string | null }[];
};

function fmtBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} KB`;
  return `${n} B`;
}

/**
 * View a submitted file without leaving the page — so a reviewer can read the
 * copy or watch the cut right inside the review queue instead of bouncing to
 * the library and back. Fetches the asset detail on open.
 */
export function FilePreview({ assetId, onClose }: { assetId: string; onClose: () => void }) {
  const [a, setA] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);

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
        className="max-h-[92vh] w-[min(900px,96vw)] overflow-y-auto rounded-xl2 border border-line bg-card p-5 shadow-lift"
      >
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-[17px]">{a?.title ?? "Loading…"}</h2>
            {a && (
              <p className="mt-0.5 truncate text-[12px] text-slate">
                {isLink
                  ? a.url
                  : `${a.filename ?? "—"}${a.mimeType ? ` · ${a.mimeType}` : ""}${a.sizeBytes != null ? ` · ${fmtBytes(a.sizeBytes)}` : ""}`}
              </p>
            )}
          </div>
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
        ) : isLink ? (
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
          <video src={a.url} controls className="mx-auto max-h-[62vh] w-auto max-w-full rounded-[12px] bg-black" />
        ) : isImage && a.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.url} alt={a.title} className="mx-auto max-h-[62vh] w-auto max-w-full rounded-[12px] object-contain" />
        ) : a.html ? (
          <article
            className="prose max-h-[68vh] max-w-none overflow-y-auto rounded-[12px] border border-line p-5 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-lg [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:mb-2 [&_p]:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: a.html }}
          />
        ) : isPdf ? (
          <iframe
            src={`/api/assets/${a.id}/download?inline=1`}
            title={a.title}
            className="h-[68vh] w-full rounded-[12px] border border-line bg-white"
          />
        ) : (
          <div className="grid place-items-center gap-2 rounded-[12px] border border-line bg-wash/[0.03] py-14 text-center">
            <div className="text-[13px] font-semibold text-ink">
              {(a.filename?.match(/\.([a-z0-9]+)$/i)?.[1] ?? "This file").toUpperCase()} can’t preview here
            </div>
            <div className="text-[12px] text-slate">Download it to view.</div>
          </div>
        )}

        {/* The description can be long (a whole slide script), so give it its own
            panel: readable line length, comfortable leading, and a scroll cap so
            it never dominates the preview. */}
        {a?.note && (
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
        {a && a.files.length > 0 && (
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
      </div>
    </div>
  );
}
