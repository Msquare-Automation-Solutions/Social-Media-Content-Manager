import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; joined?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect("/");

  const notice = sp.reset
    ? "Password updated — sign in with your new password."
    : sp.joined
      ? "You're in! Sign in to your new workspace."
      : null;

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your Social Media Content Manager workspace.">
      {notice && (
        <div className="mb-3 rounded-[10px] bg-teal-soft px-3 py-2.5 text-[12.5px] text-teal-dark">
          {notice}
        </div>
      )}
      <LoginForm initialError={Boolean(sp.error)} />
    </AuthCard>
  );
}
