import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="fixed inset-0 grid place-items-center bg-gradient-to-b from-[#eef4f6] via-teal-soft to-[#cfe9f2]">
      <div className="bg-card rounded-[22px] shadow-card w-[380px] max-w-[92vw] p-8">
        <div className="mx-auto mb-3.5 grid h-[46px] w-[46px] place-items-center rounded-[14px] bg-gradient-to-br from-teal to-[#0b6f88] text-white text-xl">
          ◆
        </div>
        <h1 className="font-display text-xl text-center mb-1">Welcome back</h1>
        <p className="text-slate text-center text-[12.5px] mb-5 leading-relaxed">
          Sign in to your MediaChat workspace.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
