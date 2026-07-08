"use client";

import { SaveDialog } from "@/components/save/save-dialog";
import { UploadPicker } from "@/components/save/upload-picker";
import { GlobalDrop } from "@/components/save/global-drop";

// Mount point for the modal layer. Individual dialogs read the shared
// DialogProvider state and render themselves.
export function Dialogs({ canUpload }: { canUpload: boolean }) {
  return (
    <>
      {canUpload && <GlobalDrop canUpload={canUpload} />}
      <UploadPicker />
      <SaveDialog />
    </>
  );
}
