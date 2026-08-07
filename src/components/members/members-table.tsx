"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { PasswordInput } from "@/components/ui/password-input";

type Member = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarUrl?: string | null;
  role: string;
  designation: string;
  disabled: boolean;
  assetCount: number;
  chatCount: number;
};

const isAdmin = (role: string) => role === "OWNER" || role === "ADMIN";

export function MembersTable({
  members,
  currentUserId,
  canManage,
}: {
  members: Member[];
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  return (
    <>
      {canManage && (
        <div className="mb-3 flex">
          <button onClick={() => setAddOpen(true)} className="btn-premium ml-auto rounded-[11px] px-4 py-2.5 font-semibold">
            ＋ Add account
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-line bg-card shadow-soft">
        <div className="grid grid-cols-[40px_1.3fr_1.4fr_1fr_90px_90px] items-center gap-3 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate/80">
          <span />
          <span>Name</span>
          <span>Email</span>
          <span>Designation</span>
          <span>Role</span>
          <span className="text-right">Content</span>
        </div>
        {members.map((m) => {
          const isSelf = m.userId === currentUserId;
          const clickable = canManage;
          return (
            <div
              key={m.membershipId}
              data-email={m.email}
              onClick={clickable ? () => setEditing(m) : undefined}
              className={`grid grid-cols-[40px_1.3fr_1.4fr_1fr_90px_90px] items-center gap-3 border-b border-line px-5 py-3 last:border-b-0 ${m.disabled ? "opacity-60" : ""} ${clickable ? "cursor-pointer hover:bg-wash/[0.03]" : ""}`}
            >
              <Avatar name={m.name} color={m.avatarColor} url={m.avatarUrl} size={34} />
              <div className="min-w-0">
                <b className="block truncate">
                  {m.name}
                  {isSelf && <span className="ml-1.5 text-[11px] font-normal text-slate">(you)</span>}
                </b>
                {m.disabled && <span className="text-[11px] font-semibold text-[#c23b2a]">Deactivated</span>}
              </div>
              <span className="truncate text-slate">{m.email}</span>
              <span className="truncate text-[12.5px] text-slate">{m.designation || <span className="text-slate/50">—</span>}</span>
              <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${isAdmin(m.role) ? "bg-[#e7defb] text-[#6b46c1]" : "bg-teal-soft text-teal-dark"}`}>
                {m.role === "OWNER"
                  ? "Owner"
                  : isAdmin(m.role)
                    ? "Admin"
                    : m.role === "CONTRIBUTOR"
                      ? "Contributor"
                      : "User"}
              </span>
              <span className="text-right text-[12.5px] text-slate tabular-nums">{m.assetCount}</span>
            </div>
          );
        })}
      </div>

      {addOpen && (
        <CreateAccountModal onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); router.refresh(); }} />
      )}
      {editing && (
        <MemberEditModal
          member={editing}
          isSelf={editing.userId === currentUserId}
          others={members.filter((x) => x.membershipId !== editing.membershipId && !x.disabled)}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function Modal({ title, subtitle, children, onClose, wide }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-[3px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${wide ? "w-[500px]" : "w-[440px]"} max-h-[92vh] max-w-[94vw] animate-fade-up overflow-y-auto rounded-xl2 border border-white/60 bg-card p-6 shadow-lift`}>
        <h2 className="font-display text-[17px]">{title}</h2>
        {subtitle && <p className="mb-4 mt-0.5 text-[12.5px] text-slate">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="mb-1.5 block text-xs font-semibold text-slate">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal";

// One dialog to edit everything about a member.
function MemberEditModal({ member, isSelf, others, onClose, onDone }: { member: Member; isSelf: boolean; others: Member[]; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const isOwner = member.role === "OWNER";
  const [name, setName] = useState(member.name);
  const [designation, setDesignation] = useState(member.designation);
  const [role, setRole] = useState(isAdmin(member.role) ? "ADMIN" : "EDITOR");
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reassignTo, setReassignTo] = useState(others[0]?.userId ?? "");
  const [busy, setBusy] = useState(false);

  const roleChanged = !isOwner && !isSelf && role !== (isAdmin(member.role) ? "ADMIN" : "EDITOR");
  const dirty = name.trim() !== member.name || designation.trim() !== member.designation || roleChanged;

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    const body: Record<string, unknown> = { name: name.trim(), designation: designation.trim() };
    if (roleChanged) body.role = role;
    const r = await fetch(`/api/members/${member.membershipId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setSaving(false);
    if (r.ok) { toast("Member updated ✓"); onDone(); } else toast((await r.text()) || "Couldn’t save.");
  }

  async function resetPw() {
    if (pw.length < 8 || busy) return;
    setBusy(true);
    const r = await fetch(`/api/members/${member.membershipId}/password`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (r.ok) { toast(`Password reset for ${member.name} ✓`); setPw(""); setPwOpen(false); } else toast("Couldn’t reset password.");
  }

  async function toggleDisabled() {
    setBusy(true);
    const r = await fetch(`/api/members/${member.membershipId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disabled: !member.disabled }),
    });
    setBusy(false);
    if (r.ok) { toast(member.disabled ? "Reactivated ✓" : "Deactivated ✓"); onDone(); } else toast((await r.text()) || "Couldn’t update.");
  }

  async function del() {
    if (!reassignTo || busy) return;
    setBusy(true);
    const r = await fetch(`/api/members/${member.membershipId}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reassignToUserId: reassignTo }),
    });
    setBusy(false);
    if (r.ok) { toast(`${member.name}'s account deleted`); onDone(); } else toast((await r.text()) || "Couldn’t delete.");
  }

  return (
    <Modal title={`Edit ${member.name}`} subtitle={member.email} onClose={onClose} wide>
      <Field label="Name">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Designation (shown next to their name when assigning work)">
        <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Content writer" className={inputCls} />
      </Field>
      <Field label="Role">
        {isOwner || isSelf ? (
          <div className="rounded-[10px] bg-bg px-3 py-2.5 text-[13px] text-slate">
            {isOwner ? "Owner (primary admin) — can’t be changed" : "You can’t change your own role"}
          </div>
        ) : (
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            <option value="EDITOR">User, create &amp; manage content</option>
            <option value="ADMIN">Admin, manage accounts &amp; content</option>
            <option value="CONTRIBUTOR">Contributor, Content Bin only</option>
          </select>
        )}
      </Field>

      <div className="mb-4 rounded-[11px] bg-bg px-3.5 py-2.5 text-[12.5px] text-slate">
        <b className="text-ink">{member.assetCount}</b> saved asset{member.assetCount === 1 ? "" : "s"} · <b className="text-ink">{member.chatCount}</b> chat{member.chatCount === 1 ? "" : "s"}
      </div>

      {/* Password reset */}
      <div className="mb-3 rounded-[11px] border border-line p-3">
        {!pwOpen ? (
          <button onClick={() => setPwOpen(true)} className="text-[12.5px] font-semibold text-teal-dark hover:underline">Reset password…</button>
        ) : (
          <>
            <Field label="New password (min 8 characters)">
              <PasswordInput value={pw} onChange={setPw} autoComplete="new-password" />
            </Field>
            <div className="flex gap-2">
              <button onClick={resetPw} disabled={pw.length < 8 || busy} className="rounded-[9px] bg-teal px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50">Set password</button>
              <button onClick={() => { setPwOpen(false); setPw(""); }} className="px-2 py-2 text-[12.5px] font-semibold text-slate">Cancel</button>
            </div>
          </>
        )}
      </div>

      {/* Danger zone */}
      {!isOwner && !isSelf && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={toggleDisabled} disabled={busy} className="rounded-[9px] border border-line px-3 py-2 text-[12.5px] font-semibold text-slate hover:border-slate disabled:opacity-50">
            {member.disabled ? "Reactivate account" : "Deactivate account"}
          </button>
          {!deleteOpen ? (
            <button onClick={() => setDeleteOpen(true)} className="rounded-[9px] border border-line px-3 py-2 text-[12.5px] font-semibold text-[#c23b2a] hover:border-[#c23b2a]">Delete account…</button>
          ) : others.length === 0 ? (
            <span className="text-[12px] text-[#c23b2a]">No other active account to reassign their content to.</span>
          ) : (
            <div className="w-full rounded-[11px] border border-[#c23b2a]/40 p-3">
              <div className="mb-2 text-[12.5px] text-slate">Reassign their content, then delete:</div>
              <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} className={inputCls}>
                {others.map((o) => <option key={o.userId} value={o.userId}>{o.name} ({o.email})</option>)}
              </select>
              <button onClick={del} disabled={busy} className="mt-2 rounded-[9px] bg-[#c23b2a] px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50">Reassign &amp; delete</button>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex justify-end gap-2.5">
        <button onClick={onClose} className="px-3 py-2.5 font-semibold text-slate">Close</button>
        <button onClick={save} disabled={!dirty || !name.trim() || saving} className="btn-premium rounded-[11px] px-5 py-2.5 font-semibold disabled:opacity-45 disabled:shadow-none">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}

function CreateAccountModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = name.trim() && /.+@.+\..+/.test(email) && password.length >= 8;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    const r = await fetch("/api/members", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), role, password }),
    });
    setSaving(false);
    if (r.status === 409) { toast("An account with that email already exists."); return; }
    if (!r.ok) { toast((await r.text()) || "Couldn't create account."); return; }
    toast(`Account for ${name.trim()} created ✓`);
    onCreated();
  }

  return (
    <Modal title="Create account" subtitle="You set the password and share it with the person, no email needed." onClose={onClose}>
      <Field label="Name">
        <input aria-label="Account name" autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Email">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@company.com" className={inputCls} />
      </Field>
      <Field label="Role">
        <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
          <option value="EDITOR">User, create &amp; manage content</option>
          <option value="ADMIN">Admin, manage accounts &amp; content</option>
          <option value="CONTRIBUTOR">Contributor, Content Bin only</option>
        </select>
      </Field>
      <Field label="Password (min 8 characters)">
        <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
      </Field>
      <div className="mt-4 flex justify-end gap-2.5">
        <button onClick={onClose} className="px-3 py-2.5 font-semibold text-slate">Cancel</button>
        <button onClick={save} disabled={!canSave || saving} className="btn-premium rounded-[11px] px-5 py-2.5 font-semibold disabled:opacity-45 disabled:shadow-none">
          {saving ? "Creating…" : "Create account"}
        </button>
      </div>
    </Modal>
  );
}
