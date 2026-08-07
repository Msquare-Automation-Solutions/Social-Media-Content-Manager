import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

/**
 * The pages everyone can reach, contributors included: the Content Bin, the
 * leaderboard, and your own account settings. The rest of the team uses these too,
 * so it's the same shell as the main app — only the sidebar narrows, and only for
 * contributors (see AppShell).
 *
 * These live in their own route group purely so the (app) layout can redirect
 * contributors without redirecting them away from the two pages they're allowed.
 * URLs are unaffected: route groups don't appear in the path.
 */
export default async function BinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <AppShell user={user}>{children}</AppShell>;
}
