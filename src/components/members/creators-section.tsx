"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreatorRow } from "@/lib/data";
import { AVATAR_COLORS, initials } from "@/lib/colors";
import { useToast } from "@/components/ui/toast";

export function CreatorsSection({
  creators,
  canManage,
}: {
  creators: CreatorRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(c: CreatorRow) {
    if (!confirm(`Remove creator “${c.name}”?`)) return;
    setBusy(true);
    const r = await fetch(`/api/people/${c.id}`, { method: "DELETE" });
    setBusy(false);
    if (r.ok) {
      toast(`Removed “${c.name}”`);
      router.refresh();
    } else if (r.status === 409) {
      toast((await r.json()).error);
    } else {
      toast("Couldn't remove creator.");
    }
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-3">
        <h3 className="font-display text-[15px] font-semibold">Creators</h3>
        <span className="rounded-full bg-wash/[0.05] px-2 py-0.5 text-[11px] font-semibold text-slate">
          {creators.length}
        </span>
        <p className="text-[12px] text-slate">
          People that content is attributed to, separate from login accounts.
        </p>
        {canManage && (
          <button
            onClick={() => {
              setAddOpen((v) => !v);
              setEditId(null);
            }}
            className="ml-auto rounded-[10px] border border-dashed border-line px-3 py-1.5 text-[12.5px] font-semibold text-teal-dark transition hover:border-teal hover:bg-teal-soft"
          >
            ＋ Add creator
          </button>
        )}
      </div>

      {addOpen && (
        <CreatorForm
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            router.refresh();
          }}
        />
      )}

      <div className="overflow-hidden rounded-card border border-line bg-card shadow-soft">
        {creators.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] text-slate">
            No creators yet.
          </div>
        )}
        {creators.map((c) =>
          editId === c.id ? (
            <div key={c.id} className="border-b border-line last:border-0">
              <CreatorForm
                creator={c}
                onClose={() => setEditId(null)}
                onSaved={() => {
                  setEditId(null);
                  router.refresh();
                }}
              />
            </div>
          ) : (
            <div
              key={c.id}
              className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0"
            >
              <span
                className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-[13px] font-bold text-white shadow-soft"
                style={{ background: c.avatarColor }}
              >
                {initials(c.name)}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[13.5px] font-semibold">
                  {c.name}
                  {c.linkedToLogin && (
                    <span className="rounded-full bg-teal-soft px-1.5 py-0.5 text-[10px] font-semibold text-teal-dark">
                      has login
                    </span>
                  )}
                </div>
                <div className="truncate text-[11.5px] text-slate">
                  {c.label || "—"}
                  {c.email ? ` · ${c.email}` : ""}
                </div>
              </div>
              <span className="ml-auto rounded-full bg-wash/[0.05] px-2.5 py-1 text-[11px] font-semibold text-slate tabular-nums">
                {c.assetCount} asset{c.assetCount === 1 ? "" : "s"}
              </span>
              {canManage && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setEditId(c.id);
                      setAddOpen(false);
                    }}
                    className="rounded-[8px] border border-line px-2.5 py-1 text-[11.5px] font-semibold text-teal-dark hover:border-teal"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(c)}
                    disabled={busy}
                    className="rounded-[8px] border border-line px-2.5 py-1 text-[11.5px] font-semibold text-[#c23b2a] hover:border-[#c23b2a] disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function CreatorForm({
  creator,
  onClose,
  onSaved,
}: {
  creator?: CreatorRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(creator?.name ?? "");
  const [label, setLabel] = useState(creator?.label ?? "");
  const [color, setColor] = useState(creator?.avatarColor ?? AVATAR_COLORS[1]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    const isEdit = Boolean(creator);
    const r = await fetch(isEdit ? `/api/people/${creator!.id}` : "/api/people", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), label: label.trim(), avatarColor: color }),
    });
    setSaving(false);
    if (r.ok) {
      toast(isEdit ? "Creator updated ✓" : `Creator “${name.trim()}” added ✓`);
      onSaved();
    } else {
      toast("Couldn't save creator.");
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2.5 bg-bg/60 px-4 py-3">
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate">
        Name
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-44 rounded-[9px] border border-line bg-card px-2.5 py-2 font-normal text-ink outline-none focus:border-teal"
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate">
        Role label (optional)
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Video editor"
          className="w-48 rounded-[9px] border border-line bg-card px-2.5 py-2 font-normal text-ink outline-none focus:border-teal"
        />
      </label>
      <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate">
        Color
        <div className="flex items-center gap-1.5 py-1.5">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full transition ${
                color === c ? "ring-2 ring-ink ring-offset-1" : ""
              }`}
              style={{ background: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>
      <div className="ml-auto flex gap-2">
        <button onClick={onClose} className="px-2 py-2 text-[12.5px] font-semibold text-slate">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!name.trim() || saving}
          className="btn-premium rounded-[10px] px-4 py-2 text-[12.5px] font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : creator ? "Save" : "Add"}
        </button>
      </div>
    </div>
  );
}
