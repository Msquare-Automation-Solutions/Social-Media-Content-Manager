"use client";

import { useRef, useState } from "react";
import { useUploadDialog, useSaveDialog } from "@/components/save/dialog-context";
import { useToast } from "@/components/ui/toast";
import { classifyFiles } from "@/lib/upload";

export function UploadPicker() {
  const upload = useUploadDialog();
  const { queueUploads } = useSaveDialog();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  if (!upload.isOpen) return null;

  function handleFiles(files: FileList | File[]) {
    const { drafts, errors } = classifyFiles(files);
    errors.forEach((e) => toast(e));
    if (drafts.length > 0) queueUploads(drafts);
    else if (errors.length === 0) toast("No files selected.");
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(20,31,46,0.44)] p-4"
      onMouseDown={(e) => e.target === e.currentTarget && upload.close()}
    >
      <div className="w-[500px] max-w-[94vw] rounded-[18px] bg-card p-6 shadow-card">
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
          className={`cursor-pointer rounded-[14px] border-2 border-dashed p-8 text-center text-slate ${
            dragging ? "border-teal bg-teal-soft" : "border-line"
          }`}
        >
          ⬆️
          <br />
          <br />
          Drag &amp; drop files here
          <br />
          or <b className="text-teal-dark">browse your computer</b>
          <div className="mt-2 text-[11px]">
            Images ≤ 10 MB · Videos ≤ 512 MB · .md / .html / .docx → Blog post
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
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
