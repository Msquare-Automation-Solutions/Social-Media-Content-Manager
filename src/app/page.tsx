import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

/**
 * Phase 1 landing. Confirms auth + workspace/membership wiring works.
 * Phase 2 replaces this with the real app shell (sidebar + chat home).
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="bg-card rounded-card shadow-card w-full max-w-md p-8">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[14px] bg-gradient-to-br from-teal to-[#0b6f88] text-white text-xl">
          ◆
        </div>
        <h1 className="font-display text-xl text-center mb-1">MediaChat</h1>
        <p className="text-slate text-center text-sm mb-6">
          Phase 1 scaffold is live. The chat studio lands here in Phase 2.
        </p>
        <div className="rounded-[12px] bg-bg p-4 text-sm space-y-1">
          <div>
            <span className="text-slate">Signed in as</span>{" "}
            <b>{user.name}</b>
          </div>
          <div className="text-slate">{user.email}</div>
          <div>
            <span className="text-slate">Workspace</span>{" "}
            <b>{user.workspaceName}</b>{" "}
            <span className="text-teal-dark font-semibold">· {user.role}</span>
          </div>
        </div>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
