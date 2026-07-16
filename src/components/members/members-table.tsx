"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { initials } from "@/lib/colors";
import { useToast } from "@/components/ui/toast";
import { PasswordInput } from "@/components/ui/password-input";

type Member = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatarColor: string;
  role: string;
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
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [resetFor, setResetFor] = useState<Member | null>(null);
  const [deleteFor, setDeleteFor] = useState<Member | null>(null);

  async function changeRole(m: Member, role: string) {
    setBusy(m.membershipId);
    const r = await fetch(`/api/members/${m.membershipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setBusy(null);
    if (r.ok) {
      toast(`${m.name} is now ${role === "ADMIN" ? "an Admin" : "a User"} ✓`);
      router.refresh();
    } else toast("Couldn't change role.");
  }

  async function setDisabled(m: Member, disabled: boolean) {
    setBusy(m.membershipId);
    const r = await fetch(`/api/members/${m.membershipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disabled }),
    });
    setBusy(null);
    if (r.ok) {
      toast(`${m.name} ${disabled ? "deactivated" : "reactivated"} ✓`);
      router.refresh();
    } else toast((await r.text()) || "Couldn't update account.");
  }

  return (
    <>
      {canManage && (
        <div className="mb-3 flex">
          <button
            onClick={() => setAddOpen(true)}
            className="btn-premium ml-auto rounded-[11px] px-4 py-2.5 font-semibold"
          >
            ＋ Add account
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-line bg-card shadow-soft">
        <div className="grid grid-cols-[40px_1.3fr_1.5fr_120px_1fr] items-center gap-3 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate/80">
          <span />
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span className="text-right">{canManage ? "Actions" : "Status"}</span>
        </div>
        {members.map((m) => {
          const isOwner = m.role === "OWNER";
          const editable = canManage && !isOwner;
          const isSelf = m.userId === currentUserId;
          return (
            <div
              key={m.membershipId}
              data-email={m.email}
              className={`grid grid-cols-[40px_1.3fr_1.5fr_120px_1fr] items-center gap-3 border-b border-line px-5 py-3 last:border-b-0 ${
                m.disabled ? "opacity-60" : ""
              }`}
            >
              <div
                className="grid h-[34px] w-[34px] place-items-center rounded-full text-[13px] font-bold text-white"
                style={{ background: m.avatarColor }}
              >
                {initials(m.name)}
              </div>
              <div className="min-w-0">
                <b className="block truncate">
                  {m.name}
                  {isSelf && (
                    <span className="ml-1.5 text-[11px] font-normal text-slate">(you)</span>
                  )}
                </b>
                {m.disabled && (
                  <span className="text-[11px] font-semibold text-[#c23b2a]">Deactivated</span>
                )}
              </div>
              <span className="truncate text-slate">{m.email}</span>
              {editable ? (
                <select
                  value={isAdmin(m.role) ? "ADMIN" : "EDITOR"}
                  disabled={busy === m.membershipId}
                  onChange={(e) => changeRole(m, e.target.value)}
                  className="rounded-[8px] border border-line px-2 py-1.5 text-[12px] font-semibold outline-none"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="EDITOR">User</option>
                </select>
              ) : (
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    isAdmin(m.role) ? "bg-[#e7defb] text-[#6b46c1]" : "bg-teal-soft text-teal-dark"
                  }`}
                >
                  {isAdmin(m.role) ? "Admin" : "User"}
                </span>
              )}
              <div className="flex justify-end gap-1.5 text-[12px] font-semibold">
                {editable ? (
                  <>
                    <button
                      onClick={() => setResetFor(m)}
                      className="rounded-[8px] border border-line px-2.5 py-1 text-teal-dark hover:border-teal"
                    >
                      Reset PW
                    </button>
                    {!isSelf && (
                      <button
                        onClick={() => setDisabled(m, !m.disabled)}
                        disabled={busy === m.membershipId}
                        className="rounded-[8px] border border-line px-2.5 py-1 text-slate hover:border-slate disabled:opacity-50"
                      >
                        {m.disabled ? "Reactivate" : "Deactivate"}
                      </button>
                    )}
                    {!isSelf && (
                      <button
                        onClick={() => setDeleteFor(m)}
                        className="rounded-[8px] border border-line px-2.5 py-1 text-[#c23b2a] hover:border-[#c23b2a]"
                      >
                        Delete
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-[11.5px] text-slate">
                    {isOwner ? "Primary admin" : m.disabled ? "Deactivated" : "Active"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {addOpen && (
        <CreateAccountModal
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            router.refresh();
          }}
        />
      )}
      {resetFor && (
        <ResetPasswordModal
          member={resetFor}
          onClose={() => setResetFor(null)}
          onDone={() => setResetFor(null)}
        />
      )}
      {deleteFor && (
        <DeleteAccountModal
          member={deleteFor}
          others={members.filter(
            (x) => x.membershipId !== deleteFor.membershipId && !x.disabled,
          )}
          onClose={() => setDeleteFor(null)}
          onDone={() => {
            setDeleteFor(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-[3px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[440px] max-w-[94vw] animate-fade-up rounded-xl2 border border-white/60 bg-card p-6 shadow-lift">
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

const inputCls =
  "w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal";

function CreateAccountModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), role, password }),
    });
    setSaving(false);
    if (r.status === 409) {
      toast("An account with that email already exists.");
      return;
    }
    if (!r.ok) {
      toast((await r.text()) || "Couldn't create account.");
      return;
    }
    toast(`Account for ${name.trim()} created ✓`);
    onCreated();
  }

  return (
    <Modal
      title="Create account"
      subtitle="You set the password and share it with the person — no email needed."
      onClose={onClose}
    >
      <Field label="Name">
        <input
          aria-label="Account name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="person@company.com"
          className={inputCls}
        />
      </Field>
      <Field label="Role">
        <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
          <option value="EDITOR">User — create &amp; manage content</option>
          <option value="ADMIN">Admin — manage accounts &amp; content</option>
        </select>
      </Field>
      <Field label="Password (min 8 characters)">
        <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
      </Field>
      <div className="mt-4 flex justify-end gap-2.5">
        <button onClick={onClose} className="px-3 py-2.5 font-semibold text-slate">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!canSave || saving}
          className="btn-premium rounded-[11px] px-5 py-2.5 font-semibold disabled:opacity-45 disabled:shadow-none"
        >
          {saving ? "Creating…" : "Create account"}
        </button>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({
  member,
  onClose,
  onDone,
}: {
  member: Member;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (password.length < 8 || saving) return;
    setSaving(true);
    const r = await fetch(`/api/members/${member.membershipId}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSaving(false);
    if (r.ok) {
      toast(`Password reset for ${member.name} ✓`);
      onDone();
    } else toast((await r.text()) || "Couldn't reset password.");
  }

  return (
    <Modal
      title={`Reset password — ${member.name}`}
      subtitle="They'll be signed out and must use the new password. Share it with them."
      onClose={onClose}
    >
      <Field label="New password (min 8 characters)">
        <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
      </Field>
      <div className="mt-4 flex justify-end gap-2.5">
        <button onClick={onClose} className="px-3 py-2.5 font-semibold text-slate">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={password.length < 8 || saving}
          className="btn-premium rounded-[11px] px-5 py-2.5 font-semibold disabled:opacity-45 disabled:shadow-none"
        >
          {saving ? "Saving…" : "Set password"}
        </button>
      </div>
    </Modal>
  );
}

function DeleteAccountModal({
  member,
  others,
  onClose,
  onDone,
}: {
  member: Member;
  others: Member[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [reassignTo, setReassignTo] = useState(others[0]?.userId ?? "");
  const [saving, setSaving] = useState(false);
  const hasContent = member.assetCount > 0 || member.chatCount > 0;

  async function del() {
    if (!reassignTo || saving) return;
    setSaving(true);
    const r = await fetch(`/api/members/${member.membershipId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reassignToUserId: reassignTo }),
    });
    setSaving(false);
    if (r.ok) {
      toast(`${member.name}'s account deleted`);
      onDone();
    } else toast((await r.text()) || "Couldn't delete account.");
  }

  return (
    <Modal
      title={`Delete ${member.name}?`}
      subtitle="This permanently removes their login. Their content is reassigned first — nothing is lost."
      onClose={onClose}
    >
      <div className="mb-3 rounded-[11px] bg-bg px-3.5 py-2.5 text-[12.5px] text-slate">
        <b className="text-ink">{member.assetCount}</b> saved asset
        {member.assetCount === 1 ? "" : "s"} · <b className="text-ink">{member.chatCount}</b> chat
        {member.chatCount === 1 ? "" : "s"} will be reassigned.
      </div>
      {others.length === 0 ? (
        <p className="mb-3 text-[12.5px] text-[#c23b2a]">
          No other active account to reassign to. Add or reactivate one first.
        </p>
      ) : (
        <Field label={hasContent ? "Reassign their content to" : "Reassign to"}>
          <select
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
            className={inputCls}
          >
            {others.map((o) => (
              <option key={o.userId} value={o.userId}>
                {o.name} ({o.email})
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="mt-4 flex justify-end gap-2.5">
        <button onClick={onClose} className="px-3 py-2.5 font-semibold text-slate">
          Cancel
        </button>
        <button
          onClick={del}
          disabled={!reassignTo || saving}
          className="rounded-[11px] bg-[#c23b2a] px-5 py-2.5 font-semibold text-white hover:brightness-95 disabled:opacity-45"
        >
          {saving ? "Deleting…" : "Reassign & Delete"}
        </button>
      </div>
    </Modal>
  );
}
