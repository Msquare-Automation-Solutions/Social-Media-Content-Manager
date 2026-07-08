"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { initials } from "@/lib/colors";
import { useToast } from "@/components/ui/toast";
import { ROLES } from "@/lib/enums";

type Member = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatarColor: string;
  role: string;
};

type Invite = { id: string; email: string; role: string; expiresAt: string };

const ROLE_STYLES: Record<string, string> = {
  OWNER: "bg-[#fdeeda] text-[#b07514]",
  ADMIN: "bg-[#e7defb] text-[#6b46c1]",
  EDITOR: "bg-teal-soft text-teal-dark",
  VIEWER: "bg-bg text-slate",
};

export function MembersTable({
  members,
  invites,
  currentUserId,
  canManage,
}: {
  members: Member[];
  invites: Invite[];
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function changeRole(m: Member, role: string) {
    setBusy(m.membershipId);
    const r = await fetch(`/api/members/${m.membershipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setBusy(null);
    if (r.ok) {
      toast(`${m.name} is now ${role.toLowerCase()} ✓`);
      router.refresh();
    } else {
      toast("Couldn't change role.");
    }
  }

  async function remove(m: Member) {
    if (!confirm(`Remove ${m.name} from the workspace?`)) return;
    setBusy(m.membershipId);
    const r = await fetch(`/api/members/${m.membershipId}`, { method: "DELETE" });
    setBusy(null);
    if (r.ok) {
      toast(`${m.name} removed`);
      router.refresh();
    } else {
      toast("Couldn't remove member.");
    }
  }

  return (
    <>
      {canManage && (
        <div className="mb-3 flex">
          <button
            onClick={() => setInviteOpen(true)}
            className="ml-auto rounded-[11px] bg-ink px-4 py-2.5 font-semibold text-white"
          >
            ＋ Invite member
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-card bg-card shadow-card">
        <div className="grid grid-cols-[44px_1.4fr_1.6fr_150px_60px] items-center gap-3 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-[#9aa7b6]">
          <span />
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span />
        </div>
        {members.map((m) => {
          const editable = canManage && m.role !== "OWNER";
          return (
            <div
              key={m.membershipId}
              className="grid grid-cols-[44px_1.4fr_1.6fr_150px_60px] items-center gap-3 border-b border-line px-5 py-3 last:border-b-0"
            >
              <div
                className="grid h-[34px] w-[34px] place-items-center rounded-full text-[13px] font-bold text-white"
                style={{ background: m.avatarColor }}
              >
                {initials(m.name)}
              </div>
              <b>
                {m.name}
                {m.userId === currentUserId && (
                  <span className="ml-1.5 text-[11px] font-normal text-slate">(you)</span>
                )}
              </b>
              <span className="truncate text-slate">{m.email}</span>
              {editable ? (
                <select
                  value={m.role}
                  disabled={busy === m.membershipId}
                  onChange={(e) => changeRole(m, e.target.value)}
                  className="rounded-[8px] border border-line px-2 py-1.5 text-[12px] font-semibold outline-none"
                >
                  {ROLES.filter((r) => r !== "OWNER").map((r) => (
                    <option key={r} value={r}>
                      {label(r)}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${ROLE_STYLES[m.role]}`}
                >
                  {label(m.role)}
                </span>
              )}
              {editable ? (
                <button
                  onClick={() => remove(m)}
                  disabled={busy === m.membershipId}
                  title="Remove member"
                  className="text-slate hover:text-[#c23b2a] disabled:opacity-50"
                >
                  Remove
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>

      {canManage && invites.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[#9aa7b6]">
            Pending invites
          </h3>
          <div className="overflow-hidden rounded-card bg-card shadow-card">
            {invites.map((i) => (
              <div
                key={i.id}
                className="flex items-center gap-3 border-b border-line px-5 py-3 text-[13px] last:border-b-0"
              >
                <span className="flex-1 truncate">{i.email}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ROLE_STYLES[i.role]}`}>
                  {label(i.role)}
                </span>
                <span className="text-[11.5px] text-slate">
                  expires {new Date(i.expiresAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {inviteOpen && (
        <InviteModal onClose={() => setInviteOpen(false)} onSent={() => router.refresh()} />
      )}
    </>
  );
}

function InviteModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [sending, setSending] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function send() {
    if (!email.trim()) return;
    setSending(true);
    const r = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    setSending(false);
    if (r.status === 409) {
      toast("That email is already a member.");
      return;
    }
    if (!r.ok) {
      toast("Couldn't create invite.");
      return;
    }
    const body = await r.json();
    onSent();
    if (body.devLink) {
      setDevLink(body.devLink);
    } else {
      toast(`Invite sent to ${email} ✓`);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(20,31,46,0.44)] p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[440px] max-w-[94vw] rounded-[18px] bg-card p-6 shadow-card">
        <h2 className="font-display text-[17px]">Invite a member</h2>
        <p className="mb-4 text-[12.5px] text-slate">
          They&apos;ll set their password from the invite link.
        </p>
        {devLink ? (
          <div>
            <p className="mb-2 text-[12.5px] text-slate">
              Dev mode — no email sent. Share this single-use link:
            </p>
            <div className="mb-4 flex gap-2">
              <input
                readOnly
                value={devLink}
                className="flex-1 rounded-[10px] border border-line px-3 py-2.5 text-[12px] outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(devLink);
                  toast("Link copied ✓");
                }}
                className="rounded-[10px] bg-teal px-3.5 font-semibold text-white"
              >
                Copy
              </button>
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className="rounded-[11px] bg-ink px-5 py-2.5 font-semibold text-white">
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="mb-1.5 block text-xs font-semibold text-slate">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="mb-3 w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
            />
            <label className="mb-1.5 block text-xs font-semibold text-slate">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mb-4 w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
            >
              {ROLES.filter((r) => r !== "OWNER").map((r) => (
                <option key={r} value={r}>
                  {label(r)}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2.5">
              <button onClick={onClose} className="px-3 py-2.5 font-semibold text-slate">
                Cancel
              </button>
              <button
                onClick={send}
                disabled={sending || !email.trim()}
                className="rounded-[11px] bg-teal px-5 py-2.5 font-semibold text-white hover:bg-teal-dark disabled:opacity-45"
              >
                {sending ? "Sending…" : "Send invite"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function label(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
