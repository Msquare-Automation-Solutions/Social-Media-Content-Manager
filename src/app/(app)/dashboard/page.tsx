import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDashboardData } from "@/lib/data";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const dynamic = "force-dynamic";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  // Default to the last 30 days; the user can widen/narrow via the date range.
  const today = new Date();
  const thirtyAgo = new Date(today.getTime() - 29 * 86_400_000);
  const from = sp.from || ymd(thirtyAgo);
  const to = sp.to || ymd(today);

  const data = await getDashboardData(user.workspaceId, { from, to });
  return <DashboardView data={data} from={from} to={to} />;
}
