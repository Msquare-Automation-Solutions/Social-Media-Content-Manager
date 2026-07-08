import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { reset?: string; joined?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const notice = searchParams.reset
    ? "Password updated — sign in with your new password."
    : searchParams.joined
      ? "You're in! Sign in to your new workspace."
      : null;

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your MediaChat workspace.">
      {notice && (
        <div className="mb-3 rounded-[10px] bg-teal-soft px-3 py-2.5 text-[12.5px] text-teal-dark">
          {notice}
        </div>
      )}
      <LoginForm />
    </AuthCard>
  );
}
