"use client";

import { SaveDialog } from "@/components/save/save-dialog";
import { UploadPicker } from "@/components/save/upload-picker";

// Mount point for the modal layer. Individual dialogs read the shared
// DialogProvider state and render themselves.
export function Dialogs() {
  return (
    <>
      <UploadPicker />
      <SaveDialog />
    </>
  );
}
