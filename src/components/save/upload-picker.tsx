"use client";

import { useRef, useState } from "react";
import { useUploadDialog, useSaveDialog } from "@/components/save/dialog-context";
import { useToast } from "@/components/ui/toast";
import { classifyFiles } from "@/lib/upload";

export function UploadPicker() {
  const upload = useUploadDialog();
  const { queueUploads, openLink } = useSaveDialog();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [link, setLink] = useState("");

  if (!upload.isOpen) return null;

  function handleFiles(files: FileList | File[]) {
    const { drafts, errors } = classifyFiles(files);
    errors.forEach((e) => toast(e));
    if (drafts.length > 0) queueUploads(drafts);
    else if (errors.length === 0) toast("No files selected.");
  }

  function addLink() {
    const url = link.trim();
    if (!url) return;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      toast("Enter a valid URL (starting with https://).");
      return;
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      toast("Links must start with http:// or https://.");
      return;
    }
    const last =
      decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "") ||
      parsed.hostname;
    openLink({ url, name: last });
    setLink("");
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-[3px]"
    >
      <div className="w-[500px] max-w-[94vw] rounded-[18px] border border-line bg-card p-6 shadow-lift ring-1 ring-black/5">
        <h2 className="font-display text-[17px]">Upload files</h2>
        <p className="mb-4 text-[12.5px] text-slate">
          Files go through the same tagging step, so everything stays filterable.
        </p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-[14px] border-2 border-dashed p-8 text-center text-slate transition ${
            dragging
              ? "border-teal bg-teal-soft"
              : "border-slate/40 bg-wash/[0.03] hover:border-teal/60 hover:bg-wash/[0.05]"
          }`}
        >
          ⬆️
          <br />
          <br />
          Drag &amp; drop files here
          <br />
          or <b className="text-teal-dark">browse your computer</b>
          <div className="mt-2 text-[11px]">
            Images ≤ 10 MB · Videos ≤ 512 MB · PDF / Word / .md / .html ≤ 25 MB
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <div className="my-3 flex items-center gap-3 text-[10.5px] font-bold uppercase tracking-wide text-slate/80">
          <div className="h-px flex-1 bg-line" />
          or paste a link
          <div className="h-px flex-1 bg-line" />
        </div>
        <div className="flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLink()}
            placeholder="https://drive.google.com/file/…"
            className="flex-1 rounded-[10px] border border-line px-3 py-2.5 text-[12.5px] outline-none focus:border-teal"
          />
          <button
            onClick={addLink}
            disabled={!link.trim()}
            className="rounded-[10px] bg-teal px-3.5 font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
          >
            Add link
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-slate">
          Saves the link as a library item (Drive, Dropbox, YouTube, any URL), it opens
          in a new tab.
        </p>

        <div className="mt-4 flex justify-end gap-2.5">
          <button
            onClick={() => upload.close()}
            className="px-3 py-2.5 font-semibold text-slate"
          >
            Cancel
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="rounded-[11px] bg-teal px-5 py-2.5 font-semibold text-white hover:bg-teal-dark"
          >
            Choose files
          </button>
        </div>
      </div>
    </div>
  );
}
