"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Artifact } from "@/lib/ai/tools";

// Shared client orchestration for the Save dialog (chat artifacts + uploads +
// editing existing assets) and the Upload picker. One provider so any surface
// can open them; the actual dialog UIs are rendered by <Dialogs/> in the app
// layout and grow across phases 3–4.

export type SaveTarget =
  | { mode: "artifact"; artifact: Artifact; messageId: string }
  | { mode: "upload"; file: UploadFileDraft }
  | { mode: "link"; link: LinkDraft }
  | { mode: "edit"; assetId: string };

export type UploadFileDraft = {
  tempId: string;
  name: string;
  category: string; // AssetType guess from MIME
  previewUrl?: string; // object URL for image preview
  mimeType: string;
  sizeBytes: number;
  file: File;
};

// An external file reference (e.g. a Google Drive / Dropbox / YouTube link).
export type LinkDraft = { url: string; name: string };

export type SavedResult = { id: string; type: string };

type SaveContextValue = {
  target: SaveTarget | null;
  queueLength: number;
  onSaved?: (result: SavedResult) => void;
  openArtifact: (
    artifact: Artifact,
    messageId: string,
    onSaved?: (r: SavedResult) => void,
  ) => void;
  openUploadFile: (file: UploadFileDraft) => void;
  queueUploads: (files: UploadFileDraft[]) => void;
  openLink: (link: LinkDraft) => void;
  openEdit: (assetId: string) => void;
  close: () => void;
};

type UploadContextValue = {
  open: (onSaved?: (r: SavedResult) => void) => void;
  isOpen: boolean;
  close: () => void;
};

const SaveContext = createContext<SaveContextValue | null>(null);
const UploadContext = createContext<UploadContextValue | null>(null);

export function useSaveDialog() {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error("useSaveDialog must be used within <DialogProvider>");
  return ctx;
}

export function useUploadDialog() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUploadDialog must be used within <DialogProvider>");
  return ctx;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<SaveTarget | null>(null);
  const [queue, setQueue] = useState<UploadFileDraft[]>([]);
  const [onSaved, setOnSaved] = useState<
    ((r: SavedResult) => void) | undefined
  >(undefined);
  const [uploadOpen, setUploadOpen] = useState(false);
  // onSaved to fire after an uploaded file is saved (e.g. link it to a task).
  const uploadSavedRef = useRef<((r: SavedResult) => void) | undefined>(undefined);

  const openArtifact = useCallback<SaveContextValue["openArtifact"]>(
    (artifact, messageId, cb) => {
      setOnSaved(() => cb);
      setQueue([]);
      setTarget({ mode: "artifact", artifact, messageId });
    },
    [],
  );
  const openUploadFile = useCallback<SaveContextValue["openUploadFile"]>((file) => {
    setUploadOpen(false);
    setOnSaved(() => uploadSavedRef.current);
    setQueue([]);
    setTarget({ mode: "upload", file });
  }, []);
  // Batch upload: tag+save each file in sequence via the same Save dialog.
  const queueUploads = useCallback<SaveContextValue["queueUploads"]>((files) => {
    if (files.length === 0) return;
    setUploadOpen(false);
    setOnSaved(() => uploadSavedRef.current);
    setTarget({ mode: "upload", file: files[0] });
    setQueue(files.slice(1));
  }, []);
  const openLink = useCallback<SaveContextValue["openLink"]>((link) => {
    setUploadOpen(false);
    setOnSaved(() => undefined);
    setQueue([]);
    setTarget({ mode: "link", link });
  }, []);
  const openEdit = useCallback<SaveContextValue["openEdit"]>((assetId) => {
    setOnSaved(() => undefined);
    setQueue([]);
    setTarget({ mode: "edit", assetId });
  }, []);
  // Closing advances to the next queued upload, if any.
  const close = useCallback(() => {
    setQueue((q) => {
      if (q.length > 0) {
        setTarget({ mode: "upload", file: q[0] });
        return q.slice(1);
      }
      setTarget(null);
      return q;
    });
  }, []);

  const saveValue = useMemo<SaveContextValue>(
    () => ({
      target,
      queueLength: queue.length,
      onSaved,
      openArtifact,
      openUploadFile,
      queueUploads,
      openLink,
      openEdit,
      close,
    }),
    [target, queue.length, onSaved, openArtifact, openUploadFile, queueUploads, openLink, openEdit, close],
  );
  const uploadValue = useMemo<UploadContextValue>(
    () => ({
      open: (cb) => {
        uploadSavedRef.current = cb;
        setUploadOpen(true);
      },
      close: () => setUploadOpen(false),
      isOpen: uploadOpen,
    }),
    [uploadOpen],
  );

  return (
    <UploadContext.Provider value={uploadValue}>
      <SaveContext.Provider value={saveValue}>{children}</SaveContext.Provider>
    </UploadContext.Provider>
  );
}
