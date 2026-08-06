"use client";

import { useRef, useState } from "react";

// Images live inside the note text as markdown, so nothing new is stored in the
// database — the note column carries both the words and the screenshots.
const IMG_RE = /!\[[^\]]*\]\(([^)\s]+)\)/g;

/** Split a stored review note into its prose and its embedded image URLs. */
export function parseNote(note: string): { text: string; images: string[] } {
  const images = [...note.matchAll(IMG_RE)].map((m) => m[1]);
  return { text: note.replace(IMG_RE, "").trim(), images };
}

function buildNote(text: string, images: string[]) {
  return [text.trim(), ...images.map((u) => `![](${u})`)].filter(Boolean).join("\n\n");
}

/** Render a review note: the paragraph, then any screenshots that came with it. */
export function ReviewNote({ note, className = "" }: { note: string; className?: string }) {
  const { text, images } = parseNote(note);
  const [zoom, setZoom] = useState<string | null>(null);
  return (
    <div className={className}>
      {text && <div className="whitespace-pre-wrap">↩ {text}</div>}
      {images.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {images.map((u) => (
            <button
              key={u}
              type="button"
              onClick={(e) => { e.stopPropagation(); setZoom(u); }}
              className="h-14 w-20 overflow-hidden rounded-[6px] border border-line hover:border-teal"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="Review screenshot" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <div
          onClick={(e) => { e.stopPropagation(); setZoom(null); }}
          className="fixed inset-0 z-[120] grid place-items-center bg-black/80 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Review screenshot" className="max-h-full max-w-full rounded-card" />
        </div>
      )}
    </div>
  );
}

/**
 * The rework note composer: room for a proper paragraph, plus screenshots
 * pasted straight from the clipboard (or dropped / picked).
 */
export function ReworkDialog({
  onSend,
  onCancel,
}: {
  onSend: (note: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setErr("");
    setBusy((n) => n + imgs.length);
    for (const f of imgs) {
      try {
        const body = new FormData();
        body.append("file", f);
        const r = await fetch("/api/review-images", { method: "POST", body });
        if (!r.ok) throw new Error(await r.text());
        const { url } = await r.json();
        setImages((prev) => [...prev, url]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not attach that image");
      } finally {
        setBusy((n) => n - 1);
      }
    }
  }

  const canSend = Boolean(text.trim() || images.length) && busy === 0;

  return (
    // Clicking the backdrop must not discard a written note — Cancel is explicit.
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/45 p-4">
      <div className="w-full max-w-[620px] rounded-card border border-line bg-card p-5 shadow-soft">
        <div className="font-display text-[15px] font-bold text-ink">Send back for rework</div>
        <p className="mt-1 text-[12px] text-slate">
          Say what needs fixing. Paste screenshots straight in (⌘V) or drop them below.
        </p>

        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const files = [...e.clipboardData.files];
            if (files.some((f) => f.type.startsWith("image/"))) {
              e.preventDefault();
              void upload(files);
            }
          }}
          onDrop={(e) => {
            const files = [...e.dataTransfer.files];
            if (files.some((f) => f.type.startsWith("image/"))) {
              e.preventDefault();
              void upload(files);
            }
          }}
          rows={7}
          placeholder="e.g. The headline reads well, but the thumbnail crop cuts the logo and the CTA is off-brand. Please redo the crop at 16:9 and use the teal button."
          className="mt-3 block max-h-[45vh] min-h-[150px] w-full resize-y rounded-[10px] border border-line bg-bg px-3 py-2.5 text-[13px] leading-[1.6] text-ink outline-none focus:border-teal"
        />

        {(images.length > 0 || busy > 0) && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {images.map((u) => (
              <div key={u} className="relative h-16 w-24 overflow-hidden rounded-[8px] border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="Attached screenshot" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((p) => p.filter((x) => x !== u))}
                  title="Remove"
                  className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white hover:bg-black/80"
                >
                  ✕
                </button>
              </div>
            ))}
            {busy > 0 && (
              <div className="grid h-16 w-24 place-items-center rounded-[8px] border border-dashed border-line text-[11px] text-slate">
                uploading…
              </div>
            )}
          </div>
        )}

        {err && <div className="mt-2 text-[11.5px] text-[#c23b2a]">{err}</div>}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="rounded-[9px] border border-line px-3 py-2 text-[12px] font-semibold text-slate hover:border-teal"
          >
            📎 Attach image
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => { void upload([...(e.target.files ?? [])]); e.target.value = ""; }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[9px] border border-line px-3.5 py-2 text-[12.5px] font-semibold text-slate hover:border-teal"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSend}
              onClick={() => onSend(buildNote(text, images))}
              className="btn-premium rounded-[9px] px-4 py-2 text-[12.5px] font-semibold disabled:opacity-50"
            >
              Send back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
