"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LIBRARY_VIEWS, LIBRARY_SLUGS, type LibraryViewKey } from "@/lib/library";
import { initials } from "@/lib/colors";
import { useUploadDialog } from "@/components/save/dialog-context";

type Props = {
  user: { name: string; email: string; role: string; avatarColor: string };
  workspaceName: string;
  counts: Record<LibraryViewKey, number>;
  membersCount: number;
};

export function Sidebar({ user, workspaceName, counts, membersCount }: Props) {
  const pathname = usePathname();
  const upload = useUploadDialog();
  const canUpload = user.role !== "VIEWER";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="flex h-screen flex-col gap-[3px] border-r border-line bg-card px-3.5 py-4">
      <div className="flex items-center gap-2.5 px-2 pb-3.5 pt-0.5 font-display text-[17px] font-bold">
        <div className="grid h-8 w-8 place-items-center rounded-[9px] bg-gradient-to-br from-teal to-[#0b6f88] text-white">
          ◆
        </div>
        {workspaceName}
      </div>

      {canUpload && (
        <button
          onClick={() => upload.open()}
          className="mb-3.5 flex items-center justify-center gap-2 rounded-[12px] bg-teal px-3.5 py-2.5 font-semibold text-white hover:bg-teal-dark"
        >
          ⬆ Upload files
        </button>
      )}

      <NavLink href="/" active={isActive("/")} label="💬 Home" />

      <div className="px-3 pb-1.5 pt-3.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#9aa7b6]">
        Library
      </div>
      {LIBRARY_VIEWS.map((v) => {
        const href = `/${LIBRARY_SLUGS[v.key]}`;
        return (
          <NavLink
            key={v.key}
            href={href}
            active={isActive(href)}
            label={`${v.icon} ${v.label}`}
            count={counts[v.key]}
          />
        );
      })}

      <div className="my-3 mx-1 h-px bg-line" />

      <NavLink
        href="/members"
        active={isActive("/members")}
        label="🧑‍🤝‍🧑 Members"
        count={membersCount}
      />
      <NavLink href="/trash" active={isActive("/trash")} label="🗑 Trash" />

      <div className="mt-auto">
        <div className="flex items-center gap-2.5 rounded-[12px] bg-bg px-3 py-2.5">
          <div
            className="grid h-8 w-8 place-items-center rounded-full text-[13px] font-bold text-white"
            style={{ background: user.avatarColor }}
          >
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <b className="block text-[12.5px]">{user.name}</b>
            <span className="block truncate text-[11px] text-slate">
              {user.email} · {roleLabel(user.role)}
            </span>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-[10px] border border-line py-2.5 font-medium text-slate hover:bg-bg hover:text-[#c23b2a]"
        >
          🚪 Sign out
        </button>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 font-medium ${
        active
          ? "bg-teal-soft font-semibold text-teal-dark"
          : "text-slate hover:bg-bg"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] ${
            active ? "bg-white text-slate" : "bg-bg text-slate"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function roleLabel(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
