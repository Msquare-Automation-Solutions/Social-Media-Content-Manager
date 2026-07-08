import { AuthCard } from "@/components/auth/auth-card";
import { ForgotForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send a link to set a new password. The link expires in 30 minutes."
    >
      <ForgotForm />
    </AuthCard>
  );
}
