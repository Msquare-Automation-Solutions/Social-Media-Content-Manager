"use client";

import { useEffect, useRef, useState } from "react";

// Inline blog/script editor with 5s-debounced autosave + "Saved · HH:MM".
export function BlogEditor({
  assetId,
  initialHtml,
  onSaved,
}: {
  assetId: string;
  initialHtml: string;
  onSaved: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(initialHtml);
  const [status, setStatus] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function save() {
    const html = latest.current;
    setStatus("Saving…");
    try {
      const r = await fetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      if (!r.ok) throw new Error();
      const t = new Date();
      setStatus(
        `Saved · ${t.getHours().toString().padStart(2, "0")}:${t
          .getMinutes()
          .toString()
          .padStart(2, "0")}`,
      );
      onSaved();
    } catch {
      setStatus("Save failed, retry");
    }
  }

  function onInput() {
    latest.current = ref.current?.innerHTML ?? "";
    setStatus("Editing…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 5000); // 5s debounce
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 rounded-[10px] border border-line px-3.5 py-2 text-[13px] font-semibold text-teal-dark hover:border-teal"
      >
        ✎ Edit content
      </button>
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center gap-3">
        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-slate">
          Editing content
        </span>
        <span className="text-[11.5px] text-slate">{status}</span>
        <button
          onClick={() => {
            if (timer.current) clearTimeout(timer.current);
            save();
          }}
          className="ml-auto rounded-[9px] bg-teal px-3 py-1.5 text-[12px] font-semibold text-white"
        >
          Save now
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={onInput}
        className="prose max-w-none rounded-[12px] border border-line p-4 outline-none focus:border-teal [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-lg [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold [&_p]:mb-2 [&_p]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: initialHtml }}
      />
    </div>
  );
}
