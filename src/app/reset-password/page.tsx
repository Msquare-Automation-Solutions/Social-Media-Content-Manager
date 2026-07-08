import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "./reset-form";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";
  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a new password for your account. Minimum 8 characters."
    >
      {token ? (
        <ResetForm token={token} />
      ) : (
        <div className="text-center text-[12.5px] text-slate">
          Missing or invalid reset link.{" "}
          <a href="/forgot-password" className="font-semibold text-teal-dark">
            Request a new one
          </a>
          .
        </div>
      )}
    </AuthCard>
  );
}
