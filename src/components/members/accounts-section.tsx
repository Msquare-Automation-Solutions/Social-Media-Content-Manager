"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountRow } from "@/lib/data";
import { AVATAR_COLORS } from "@/lib/colors";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { useToast } from "@/components/ui/toast";

export function AccountsSection({
  accounts,
  canManage,
}: {
  accounts: AccountRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(a: AccountRow) {
    if (!confirm(`Delete account “${a.name}”? Existing content keeps its tag.`)) return;
    setBusy(true);
    const r = await fetch(`/api/accounts/${a.id}`, { method: "DELETE" });
    setBusy(false);
    if (r.ok) {
      toast(`Deleted “${a.name}”`);
      router.refresh();
    } else {
      toast("Couldn't delete account.");
    }
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-3">
        <h3 className="font-display text-[15px] font-semibold">Accounts</h3>
        <span className="rounded-full bg-wash/[0.05] px-2 py-0.5 text-[11px] font-semibold text-slate">
          {accounts.length}
        </span>
        <p className="text-[12px] text-slate">
          The accounts content is assigned to (e.g. Faasil, Jahar, Msquare, AI Lab).
        </p>
        {canManage && (
          <button
            onClick={() => {
              setAddOpen((v) => !v);
              setEditId(null);
            }}
            className="ml-auto rounded-[10px] border border-dashed border-line px-3 py-1.5 text-[12.5px] font-semibold text-teal-dark transition hover:border-teal hover:bg-teal-soft"
          >
            ＋ Add account
          </button>
        )}
      </div>

      {addOpen && (
        <AccountForm
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            router.refresh();
          }}
        />
      )}

      <div className="overflow-hidden rounded-card border border-line bg-card shadow-soft">
        {accounts.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] text-slate">No accounts yet.</div>
        )}
        {accounts.map((a) =>
          editId === a.id ? (
            <div key={a.id} className="border-b border-line last:border-0">
              <AccountForm
                account={a}
                onClose={() => setEditId(null)}
                onSaved={() => {
                  setEditId(null);
                  router.refresh();
                }}
              />
            </div>
          ) : (
            <div
              key={a.id}
              className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0"
            >
              <span
                className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-white shadow-soft ring-1 ring-black/5"
              >
                <PlatformIcon name={a.name} icon={a.icon} size={18} />
              </span>
              <div className="min-w-0 text-[13.5px] font-semibold">{a.name}</div>
              <span className="ml-auto rounded-full bg-wash/[0.05] px-2.5 py-1 text-[11px] font-semibold text-slate tabular-nums">
                {a.assetCount} asset{a.assetCount === 1 ? "" : "s"}
              </span>
              {canManage && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setEditId(a.id);
                      setAddOpen(false);
                    }}
                    className="rounded-[8px] border border-line px-2.5 py-1 text-[11.5px] font-semibold text-teal-dark hover:border-teal"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(a)}
                    disabled={busy}
                    className="rounded-[8px] border border-line px-2.5 py-1 text-[11.5px] font-semibold text-[#c23b2a] hover:border-[#c23b2a] disabled:opacity-50"
                  >
                    Delete
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

function AccountForm({
  account,
  onClose,
  onSaved,
}: {
  account?: AccountRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(account?.name ?? "");
  const [icon, setIcon] = useState(account?.icon ?? "✨");
  const [color, setColor] = useState(account?.color ?? AVATAR_COLORS[1]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    const isEdit = Boolean(account);
    const r = await fetch(isEdit ? `/api/accounts/${account!.id}` : "/api/accounts", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), icon: icon.trim() || "✨", color }),
    });
    setSaving(false);
    if (r.ok) {
      toast(isEdit ? "Account updated ✓" : `Account “${name.trim()}” added ✓`);
      onSaved();
    } else {
      toast("Couldn't save account.");
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2.5 bg-bg/60 px-4 py-3">
      <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate">
        Preview
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-soft ring-1 ring-black/5">
          <PlatformIcon name={name || "?"} icon={icon || "✨"} size={18} />
        </span>
      </div>
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
        Icon (emoji)
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="✨"
          className="w-20 rounded-[9px] border border-line bg-card px-2.5 py-2 text-center font-normal text-ink outline-none focus:border-teal"
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
          {saving ? "Saving…" : account ? "Save" : "Add"}
        </button>
      </div>
    </div>
  );
}
