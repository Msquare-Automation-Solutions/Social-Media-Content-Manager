import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ChangePasswordForm } from "@/components/account/change-password-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-4 flex items-center gap-3.5">
        <Link href="/" className="text-[13px] font-semibold text-teal-dark">
          ← Back to chat
        </Link>
        <h2 className="font-display text-[19px]">Account settings</h2>
      </div>

      <div className="max-w-[440px] rounded-card bg-card p-6 shadow-card">
        <div className="mb-5 space-y-1 text-[13px]">
          <div>
            <span className="text-slate">Name</span> <b>{user.name}</b>
          </div>
          <div>
            <span className="text-slate">Email</span> <b>{user.email}</b>
          </div>
          <div>
            <span className="text-slate">Role</span>{" "}
            <b>{user.role.charAt(0) + user.role.slice(1).toLowerCase()}</b>
          </div>
        </div>
        <h3 className="mb-3 font-display text-[15px]">Change password</h3>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
