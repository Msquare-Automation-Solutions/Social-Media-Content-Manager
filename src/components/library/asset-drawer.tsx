"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TYPE_LABELS } from "@/lib/library";
import { initials } from "@/lib/colors";
import { AssetPreview } from "@/components/library/asset-card";
import { StatusBadge } from "@/components/library/status-badge";
import { PlatformIcon } from "@/components/ui/platform-icon";
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
  note: string | null;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  person: { id: string; name: string; avatarColor: string };
  channels: {
    id: string;
    name: string;
    icon: string;
    color: string;
    scheduledFor: string | null;
  }[];
  channelIds: string[];
  versionCount: number;
  canEdit: boolean;
  canPublish: boolean;
  canUnpublish: boolean;
};

export function AssetDrawer({
  assetId,
  canEdit,
  canReview = false,
  onClose,
  onChanged,
}: {
  assetId: string;
  canEdit: boolean;
  canReview?: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reworkOpen, setReworkOpen] = useState(false);
  const [reworkNote, setReworkNote] = useState("");
  const replaceInput = useRef<HTMLInputElement>(null);

  async function review(status: "APPROVED" | "REWORK" | "PUBLISHED", note?: string) {
    setBusy(true);
    const r = await fetch(`/api/assets/${assetId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
    setBusy(false);
    if (r.ok) {
      toast(
        status === "APPROVED"
          ? "Approved ✓"
          : status === "PUBLISHED"
            ? "Marked as published ✓"
            : "Sent back for rework",
      );
      setReworkOpen(false);
      setReworkNote("");
      refetch();
      onChanged();
    } else {
      toast((await r.text()) || "Couldn't update status.");
    }
  }

  // After any mutation that writes a snapshot, the separate version-history
  // query must be invalidated so the new snapshot appears immediately.
  const refreshVersions = () =>
    qc.invalidateQueries({ queryKey: ["versions", assetId] });

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
      onClose();
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
      refreshVersions();
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
              refreshVersions();
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
              {/* Review status + admin controls */}
              <div className="mb-4 rounded-[12px] border border-line p-3.5">
                <div className="flex items-center gap-2">
                  <StatusBadge status={asset.status} />
                  {asset.reviewedAt && (
                    <span className="text-[11px] text-slate">
                      reviewed {new Date(asset.reviewedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {asset.status === "REWORK" && asset.reviewNote && (
                  <div className="mt-2 rounded-[9px] bg-[#fdecea] px-3 py-2 text-[12px] text-[#c23b2a]">
                    <b>Rework requested:</b> {asset.reviewNote}
                  </div>
                )}
                {canReview ? (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {asset.status !== "APPROVED" && (
                        <button
                          onClick={() => review("APPROVED")}
                          disabled={busy}
                          className="rounded-[9px] bg-teal px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
                        >
                          ✓ Approve
                        </button>
                      )}
                      <button
                        onClick={() => setReworkOpen((v) => !v)}
                        className="rounded-[9px] border border-line px-3.5 py-1.5 text-[12.5px] font-semibold text-[#c23b2a] hover:border-[#c23b2a]"
                      >
                        Request rework
                      </button>
                    </div>
                    {reworkOpen && (
                      <div className="mt-2">
                        <textarea
                          autoFocus
                          value={reworkNote}
                          onChange={(e) => setReworkNote(e.target.value)}
                          placeholder="What needs to change?"
                          rows={2}
                          className="w-full rounded-[9px] border border-line px-3 py-2 text-[12.5px] outline-none focus:border-teal"
                        />
                        <button
                          onClick={() => review("REWORK", reworkNote.trim())}
                          disabled={busy || !reworkNote.trim()}
                          className="mt-1.5 rounded-[9px] bg-[#c23b2a] px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:brightness-95 disabled:opacity-50"
                        >
                          Send back for rework
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-[11.5px] text-slate">
                    {asset.status === "APPROVED"
                      ? "Approved — queued for publishing."
                      : asset.status === "PUBLISHED"
                        ? "Published."
                        : asset.status === "REWORK"
                          ? "Edit this item to resubmit it for review."
                          : "Waiting for an admin to review."}
                  </p>
                )}
                {/* Publish workflow: the creator or an admin marks an approved
                    item as published once it's live. */}
                {asset.canPublish && (
                  <div className="mt-3">
                    <button
                      onClick={() => review("PUBLISHED")}
                      disabled={busy}
                      className="rounded-[9px] bg-[#3f63d0] px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:brightness-95 disabled:opacity-50"
                    >
                      ⬆ Mark as published
                    </button>
                  </div>
                )}
                {asset.canUnpublish && (
                  <div className="mt-3">
                    <button
                      onClick={() => review("APPROVED")}
                      disabled={busy}
                      className="rounded-[9px] border border-line px-3.5 py-1.5 text-[12.5px] font-semibold text-slate hover:border-teal hover:text-teal-dark disabled:opacity-50"
                    >
                      ↩ Move back to approved
                    </button>
                  </div>
                )}
              </div>

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
                      <span
                        key={c.id}
                        className="flex items-center gap-1 rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold"
                      >
                        <PlatformIcon name={c.name} icon={c.icon} size={14} className="shrink-0" /> {c.name}
                        {c.scheduledFor && (
                          <span className="font-normal text-teal-dark">
                            · 📅 {new Date(c.scheduledFor).toLocaleDateString()}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </Row>
                {asset.note && (
                  <Row label="Note">
                    <span className="whitespace-pre-wrap">{asset.note}</span>
                  </Row>
                )}
                <Row label="Source">
                  {asset.source === "GENERATED"
                    ? "AI generated"
                    : asset.source === "LINK"
                      ? "External link"
                      : "Upload"}
                </Row>
                {asset.source === "LINK" && asset.url && (
                  <Row label="Link">
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-teal-dark underline"
                    >
                      {asset.url}
                    </a>
                  </Row>
                )}
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
                <Row label="Created">
                  {new Date(asset.createdAt).toLocaleString()}
                </Row>
                {asset.updatedAt &&
                  new Date(asset.updatedAt).getTime() -
                    new Date(asset.createdAt).getTime() >
                    1000 && (
                    <Row label="Updated">
                      {new Date(asset.updatedAt).toLocaleString()}
                    </Row>
                  )}
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
              {asset.url &&
                (asset.source === "LINK" ? (
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-[10px] border border-line px-3.5 py-2 text-[13px] font-semibold text-teal-dark hover:border-teal"
                  >
                    ↗ Open link
                  </a>
                ) : (
                  <a
                    href={`/api/assets/${asset.id}/download`}
                    download={asset.filename ?? undefined}
                    className="rounded-[10px] border border-line px-3.5 py-2 text-[13px] font-semibold text-teal-dark hover:border-teal"
                  >
                    ⬇ Download
                  </a>
                ))}
              {canDoEdit && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-[10px] border border-line px-3.5 py-2 text-[13px] font-semibold text-teal-dark hover:border-teal"
                  >
                    ✎ Edit tags & fields
                  </button>
                  {asset.url && asset.source !== "LINK" && (
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
