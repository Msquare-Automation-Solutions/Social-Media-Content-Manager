import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isContributor } from "@/lib/roles";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // One gate for the whole product. Contributors exist to fill the Content Bin
  // and watch the leaderboard, both of which live in the (bin) route group; every
  // other page hangs off this layout, so this single line keeps them out of all
  // of them. The API guards enforce the same thing independently — this is the
  // part that makes it behave nicely rather than the part that makes it safe.
  if (isContributor(user.role)) redirect("/content-bin");

  return <AppShell user={user}>{children}</AppShell>;
}
