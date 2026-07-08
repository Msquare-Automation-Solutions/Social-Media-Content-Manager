"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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

type SaveContextValue = {
  target: SaveTarget | null;
  onSaved?: (result: { type: string }) => void;
  openArtifact: (
    artifact: Artifact,
    messageId: string,
    onSaved?: (r: { type: string }) => void,
  ) => void;
  openUploadFile: (file: UploadFileDraft) => void;
  openEdit: (assetId: string) => void;
  close: () => void;
};

type UploadContextValue = { open: () => void; isOpen: boolean; close: () => void };

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
  const [onSaved, setOnSaved] = useState<
    ((r: { type: string }) => void) | undefined
  >(undefined);
  const [uploadOpen, setUploadOpen] = useState(false);

  const openArtifact = useCallback<SaveContextValue["openArtifact"]>(
    (artifact, messageId, cb) => {
      setOnSaved(() => cb);
      setTarget({ mode: "artifact", artifact, messageId });
    },
    [],
  );
  const openUploadFile = useCallback<SaveContextValue["openUploadFile"]>((file) => {
    setUploadOpen(false);
    setOnSaved(() => undefined);
    setTarget({ mode: "upload", file });
  }, []);
  const openEdit = useCallback<SaveContextValue["openEdit"]>((assetId) => {
    setOnSaved(() => undefined);
    setTarget({ mode: "edit", assetId });
  }, []);
  const close = useCallback(() => setTarget(null), []);

  const saveValue = useMemo<SaveContextValue>(
    () => ({ target, onSaved, openArtifact, openUploadFile, openEdit, close }),
    [target, onSaved, openArtifact, openUploadFile, openEdit, close],
  );
  const uploadValue = useMemo<UploadContextValue>(
    () => ({
      open: () => setUploadOpen(true),
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
