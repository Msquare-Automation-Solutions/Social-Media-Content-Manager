"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full rounded-[10px] border border-line py-2.5 font-medium text-slate hover:bg-bg"
    >
      🚪 Sign out
    </button>
  );
}
