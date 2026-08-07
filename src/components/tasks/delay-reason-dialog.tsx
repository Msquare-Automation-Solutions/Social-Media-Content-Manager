"use client";

import { useState } from "react";

/**
 * Asked for at the moment of publishing late, because that's the only moment
 * anyone still remembers why. A delayed count with no reasons behind it tells you
 * something went wrong but never what.
 */
export function DelayReasonDialog({
  title,
  scheduledFor,
  daysLate,
  onCancel,
  onPublish,
}: {
  title: string;
  scheduledFor: string;
  daysLate: number;
  onCancel: () => void;
  onPublish: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const ready = reason.trim().length > 2;

  return (
    // The backdrop deliberately doesn't close: a half-typed reason shouldn't be
    // lost to a stray click, and publishing is not something to do by accident.
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/45 p-4">
      <div className="w-full max-w-[540px] rounded-card border border-line bg-card p-5 shadow-soft">
        <div className="font-display text-[15px] font-bold text-ink">Publishing late</div>
        <p className="mt-1 text-[12.5px] text-slate">
          <span className="font-semibold text-ink">{title}</span> was due {scheduledFor} —{" "}
          {daysLate === 1 ? "a day" : `${daysLate} days`} ago. Record why before it goes out.
        </p>

        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="e.g. Client took a week to approve the script, so filming slipped."
          className="mt-3 block min-h-[96px] w-full resize-y rounded-[10px] border border-line bg-bg px-3 py-2.5 text-[13px] leading-[1.6] text-ink outline-none focus:border-teal"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[9px] border border-line px-3.5 py-2 text-[12.5px] font-semibold text-slate hover:border-teal"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => onPublish(reason.trim())}
            className="btn-premium rounded-[9px] px-4 py-2 text-[12.5px] font-semibold disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
