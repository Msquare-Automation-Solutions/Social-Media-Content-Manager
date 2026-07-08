"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TYPE_LABELS } from "@/lib/library";
import { initials } from "@/lib/colors";
import { AssetPreview } from "@/components/library/asset-card";
import { BlogEditor } from "@/components/library/blog-editor";
import { EditAssetDialog } from "@/components/library/edit-asset-dialog";
import { VersionHistory } from "@/components/library/version-history";
import { useToast } from "@/components/ui/toast";

type AssetDetail = {
  id: string;
  title: string;
  type: string;
  source: string;
  html: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  filename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  tags: string[];
  createdAt: string;
  person: { id: string; name: string; avatarColor: string };
  channels: { id: string; name: string; icon: string; color: string }[];
  channelIds: string[];
  versionCount: number;
  canEdit: boolean;
};

export function AssetDrawer({
  assetId,
  canEdit,
  onClose,
  onChanged,
}: {
  assetId: string;
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const replaceInput = useRef<HTMLInputElement>(null);

  const { data: asset, refetch, isLoading } = useQuery<AssetDetail>({
    queryKey: ["asset", assetId],
    queryFn: async () => {
      const r = await fetch(`/api/assets/${assetId}`);
      if (!r.ok) throw new Error("Failed to load asset");
      return r.json();
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function del() {
    if (!asset) return;
    if (!confirm(`Move “${asset.title}” to Trash? You can restore it within 30 days.`))
      return;
    setBusy(true);
    const r = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
    setBusy(false);
    if (r.ok) {
      toast("Moved to Trash 🗑");
      onChanged();
    } else {
      toast("Couldn't delete.");
    }
  }

  async function replaceFile(file: File | null) {
    if (!file || !asset) return;
    setBusy(true);
    const form = new FormData();
    form.set("payload", JSON.stringify({}));
    form.set("file", file);
    const r = await fetch(`/api/assets/${assetId}`, { method: "PATCH", body: form });
    setBusy(false);
    if (r.ok) {
      toast("File replaced · previous kept as a version ✓");
      refetch();
      onChanged();
    } else {
      toast("Replace failed.");
    }
  }

  const isDoc = asset ? asset.type === "BLOGPOST" || asset.type === "VIDEO_SCRIPT" || Boolean(asset.html) : false;
  const canDoEdit = canEdit && (asset?.canEdit ?? false);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-[rgba(20,31,46,0.44)]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full w-[560px] max-w-[94vw] flex-col overflow-y-auto bg-card shadow-card">
        {isLoading || !asset ? (
          <div className="grid flex-1 place-items-center text-slate">Loading…</div>
        ) : editing ? (
          <EditAssetDialog
            asset={asset}
            onClose={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              refetch();
              onChanged();
            }}
          />
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-line px-6 py-4">
              <span className="rounded-full bg-teal-soft px-2.5 py-0.5 text-[10px] font-bold uppercase text-teal-dark">
                {TYPE_LABELS[asset.type] ?? asset.type}
              </span>
              <h2 className="flex-1 truncate font-display text-[16px] font-semibold">
                {asset.title}
              </h2>
              <button onClick={onClose} className="text-slate hover:text-ink">
                ✕
              </button>
            </div>

            <div className="flex-1 px-6 py-5">
              {/* Preview or rendered document */}
              {asset.mimeType?.startsWith("video/") && asset.url ? (
                <video src={asset.url} controls className="w-full rounded-[12px]" />
              ) : asset.mimeType?.startsWith("image/") && asset.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.url} alt={asset.title} className="w-full rounded-[12px]" />
              ) : isDoc && asset.html ? (
                <article
                  className="prose max-w-none rounded-[12px] border border-line p-5 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-lg [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:mb-2 [&_p]:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: asset.html }}
                />
              ) : (
                <AssetPreview asset={asset} className="h-[220px] rounded-[12px]" />
              )}

              {/* Meta */}
              <dl className="mt-5 space-y-2.5 text-[13px]">
                <Row label="Person">
                  <span
                    className="grid h-[20px] w-[20px] place-items-center rounded-full text-[9px] font-bold text-white"
                    style={{ background: asset.person.avatarColor }}
                  >
                    {initials(asset.person.name)}
                  </span>
                  {asset.person.name}
                </Row>
                <Row label="Platforms">
                  <div className="flex flex-wrap gap-1.5">
                    {asset.channels.map((c) => (
                      <span key={c.id} className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold">
                        {c.icon} {c.name}
                      </span>
                    ))}
                  </div>
                </Row>
                <Row label="Source">
                  {asset.source === "GENERATED" ? "AI generated" : "Upload"}
                </Row>
                {asset.tags.length > 0 && (
                  <Row label="Tags">
                    <div className="flex flex-wrap gap-1.5">
                      {asset.tags.map((t) => (
                        <span key={t} className="rounded-full bg-bg px-2 py-0.5 text-[11px]">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </Row>
                )}
                <Row label="Saved">{new Date(asset.createdAt).toLocaleDateString()}</Row>
                {asset.versionCount > 0 && (
                  <Row label="Versions">{asset.versionCount} snapshot(s)</Row>
                )}
              </dl>

              {/* Inline blog/script editor */}
              {isDoc && asset.html && canDoEdit && (
                <BlogEditor
                  assetId={asset.id}
                  initialHtml={asset.html}
                  onSaved={() => onChanged()}
                />
              )}

              {/* Version history + restore */}
              <VersionHistory
                assetId={asset.id}
                canRestore={canDoEdit}
                onRestored={() => {
                  refetch();
                  onChanged();
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-6 py-4">
              {asset.url && (
                <a
                  href={asset.url}
                  download={asset.filename ?? undefined}
                  className="rounded-[10px] border border-line px-3.5 py-2 text-[13px] font-semibold text-teal-dark hover:border-teal"
                >
                  ⬇ Download
                </a>
              )}
              {canDoEdit && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-[10px] border border-line px-3.5 py-2 text-[13px] font-semibold text-teal-dark hover:border-teal"
                  >
                    ✎ Edit tags & fields
                  </button>
                  {asset.url && (
                    <>
                      <button
                        onClick={() => replaceInput.current?.click()}
                        disabled={busy}
                        className="rounded-[10px] border border-line px-3.5 py-2 text-[13px] font-semibold text-teal-dark hover:border-teal disabled:opacity-50"
                      >
                        ⟳ Replace file
                      </button>
                      <input
                        ref={replaceInput}
                        type="file"
                        className="hidden"
                        onChange={(e) => replaceFile(e.target.files?.[0] ?? null)}
                      />
                    </>
                  )}
                  <button
                    onClick={del}
                    disabled={busy}
                    className="ml-auto rounded-[10px] border border-line px-3.5 py-2 text-[13px] font-semibold text-[#c23b2a] hover:border-[#c23b2a] disabled:opacity-50"
                  >
                    🗑 Delete
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="w-20 flex-shrink-0 text-[11.5px] font-semibold uppercase tracking-wide text-slate">
        {label}
      </dt>
      <dd className="flex flex-1 flex-wrap items-center gap-1.5">{children}</dd>
    </div>
  );
}
