"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

type Person = { id: string; name: string };

export function BulkBar({
  count,
  ids,
  people,
  onClear,
  onDone,
}: {
  count: number;
  ids: string[];
  people: Person[];
  onClear: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<null | "creator" | "tags">(null);
  const [tagInput, setTagInput] = useState("");
  const [tagMode, setTagMode] = useState<"addTags" | "setTags">("addTags");

  async function run(body: Record<string, unknown>, successMsg: (n: number) => string) {
    setBusy(true);
    const r = await fetch("/api/assets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, ...body }),
    });
    setBusy(false);
    if (!r.ok) {
      toast("Bulk action failed.");
      return;
    }
    const { applied, skipped } = await r.json();
    toast(successMsg(applied) + (skipped ? ` · ${skipped} skipped (no access)` : ""));
    setPanel(null);
    onDone();
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex flex-col gap-2 rounded-xl2 border border-line/70 bg-card/95 p-2 pl-4 shadow-lift backdrop-blur">
        {panel === "creator" && (
          <div className="flex items-center gap-2 px-1 pt-1">
            <span className="text-[12px] font-semibold text-slate">Set creator:</span>
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) =>
                e.target.value &&
                run({ action: "setPerson", personId: e.target.value }, (n) => `Creator set on ${n} item${n === 1 ? "" : "s"} ✓`)
              }
              className="rounded-[9px] border border-line px-2.5 py-1.5 text-[12.5px] outline-none focus:border-teal"
            >
              <option value="" disabled>
                Choose person…
              </option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {panel === "tags" && (
          <div className="flex items-center gap-2 px-1 pt-1">
            <select
              value={tagMode}
              onChange={(e) => setTagMode(e.target.value as "addTags" | "setTags")}
              className="rounded-[9px] border border-line px-2 py-1.5 text-[12.5px] outline-none focus:border-teal"
            >
              <option value="addTags">Add tags</option>
              <option value="setTags">Replace tags</option>
            </select>
            <input
              autoFocus
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="q3-campaign, automation"
              className="w-56 rounded-[9px] border border-line px-2.5 py-1.5 text-[12.5px] outline-none focus:border-teal"
            />
            <button
              disabled={busy || !tagInput.trim()}
              onClick={() =>
                run(
                  { action: tagMode, tags: tagInput.split(",").map((t) => t.trim()).filter(Boolean) },
                  (n) => `Tags updated on ${n} item${n === 1 ? "" : "s"} ✓`,
                )
              }
              className="btn-premium rounded-[9px] px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold">
            {count} selected
          </span>
          <div className="mx-1 h-5 w-px bg-line" />
          <BarBtn active={panel === "creator"} onClick={() => setPanel(panel === "creator" ? null : "creator")}>
            Set creator
          </BarBtn>
          <BarBtn active={panel === "tags"} onClick={() => setPanel(panel === "tags" ? null : "tags")}>
            Edit tags
          </BarBtn>
          <button
            disabled={busy}
            onClick={() => {
              if (confirm(`Move ${count} item${count === 1 ? "" : "s"} to Trash?`))
                run({ action: "delete" }, (n) => `Moved ${n} item${n === 1 ? "" : "s"} to Trash`);
            }}
            className="rounded-[9px] border border-line px-3 py-1.5 text-[12.5px] font-semibold text-[#c23b2a] transition hover:border-[#c23b2a] disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={onClear}
            className="rounded-[9px] px-2 py-1.5 text-[12.5px] font-semibold text-slate hover:text-ink"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

function BarBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[9px] border px-3 py-1.5 text-[12.5px] font-semibold transition ${
        active
          ? "border-teal bg-teal-soft text-teal-dark"
          : "border-line text-teal-dark hover:border-teal"
      }`}
    >
      {children}
    </button>
  );
}
