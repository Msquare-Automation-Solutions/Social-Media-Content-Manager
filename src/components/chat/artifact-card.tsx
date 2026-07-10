"use client";

import type { Artifact } from "@/lib/ai/tools";
import { TYPE_LABELS } from "@/lib/library";
import { artifactGradient, downloadArtifact } from "@/lib/artifact-view";
import { useSaveDialog } from "@/components/save/dialog-context";
import { useToast } from "@/components/ui/toast";

type Props = {
  artifact: Artifact;
  messageId: string;
  saved?: boolean;
  savedType?: string;
  onSaved?: (type: string) => void;
};

export function ArtifactCard({ artifact, messageId, saved, savedType, onSaved }: Props) {
  const save = useSaveDialog();
  const { toast } = useToast();
  const typeLabel = TYPE_LABELS[artifact.kind] ?? artifact.kind;
  const showCover = artifact.kind !== "VIDEO_SCRIPT";

  return (
    <div className="mt-3 max-w-[530px] animate-fade-up overflow-hidden rounded-card border border-line/70 bg-card shadow-card">
      {showCover && (
        <div
          className="grid h-[130px] place-items-center px-4 text-center font-display text-[15px] font-semibold text-white"
          style={{ background: artifactGradient(artifact) }}
        >
          {artifact.kind === "THUMBNAIL" ? artifact.title : ""}
        </div>
      )}
      <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5 text-[13px] font-semibold">
        <span className="rounded-full bg-teal-soft px-2.5 py-0.5 text-[10px] font-bold uppercase text-teal-dark">
          {typeLabel}
        </span>
        {artifact.title}
      </div>
      <div className="max-h-[170px] overflow-hidden px-3.5 py-3 text-[13px] leading-relaxed text-slate">
        <ArtifactBody artifact={artifact} />
      </div>
      <div className="flex items-center gap-2 border-t border-line px-3.5 py-2.5">
        {saved ? (
          <>
            <button
              className="rounded-[9px] border border-line px-3 py-1.5 text-[12px] font-semibold text-teal-dark"
              onClick={() => downloadArtifact(artifact)}
            >
              Download
            </button>
            <span className="ml-auto text-[11.5px] font-semibold text-teal-dark">
              ✓ Saved{savedType ? ` to ${TYPE_LABELS[savedType] ?? savedType}` : ""}
            </span>
          </>
        ) : (
          <>
            <button
              className="btn-premium rounded-[9px] px-4 py-1.5 text-[12px] font-semibold"
              onClick={() => save.openArtifact(artifact, messageId, (r) => onSaved?.(r.type))}
            >
              Save…
            </button>
            <button
              className="rounded-[9px] border border-line px-3 py-1.5 text-[12px] font-semibold text-teal-dark"
              onClick={() => toast("Save it first to open in the library reader.")}
            >
              Open
            </button>
            <button
              className="rounded-[9px] border border-line px-3 py-1.5 text-[12px] font-semibold text-teal-dark"
              onClick={() => downloadArtifact(artifact)}
            >
              Download
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ArtifactBody({ artifact }: { artifact: Artifact }) {
  if (artifact.kind === "BLOGPOST") {
    return (
      <div
        className="prose-sm line-clamp-6 [&_h2]:mb-1 [&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:mt-2 [&_h3]:font-semibold [&_p]:mb-2"
        dangerouslySetInnerHTML={{ __html: artifact.html }}
      />
    );
  }
  if (artifact.kind === "THUMBNAIL") {
    return (
      <div className="space-y-1.5">
        <b className="text-ink">Caption options:</b>
        <ol className="ml-4 list-decimal">
          {artifact.captionOptions.map((c, i) => (
            <li key={i}>&ldquo;{c}&rdquo;</li>
          ))}
        </ol>
        <div>
          <b className="text-ink">Design:</b> {artifact.designNotes}
        </div>
      </div>
    );
  }
  // VIDEO_SCRIPT
  return (
    <div className="space-y-1.5">
      {artifact.sections.map((s, i) => (
        <div key={i}>
          <b className="text-ink">{s.heading}:</b> {s.body}
        </div>
      ))}
    </div>
  );
}
