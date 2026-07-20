"use client";

import { useEffect, useState } from "react";
import { useSaveDialog } from "@/components/save/dialog-context";
import { useToast } from "@/components/ui/toast";
import { classifyFiles } from "@/lib/upload";

// "Drag-drop anywhere", a full-window overlay appears while dragging files,
// and dropped files route straight into the batch Save queue.
export function GlobalDrop({ canUpload }: { canUpload: boolean }) {
  const { queueUploads } = useSaveDialog();
  const { toast } = useToast();
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!canUpload) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const { drafts, errors } = classifyFiles(e.dataTransfer!.files);
      errors.forEach((msg) => toast(msg));
      if (drafts.length) queueUploads(drafts);
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [canUpload, queueUploads, toast]);

  if (!dragging) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] grid place-items-center bg-[rgba(14,159,143,0.12)] p-10">
      <div className="rounded-[18px] border-2 border-dashed border-teal bg-card/90 px-16 py-12 text-center font-display text-lg text-teal-dark shadow-card">
        ⬆️ Drop files to upload
      </div>
    </div>
  );
}
