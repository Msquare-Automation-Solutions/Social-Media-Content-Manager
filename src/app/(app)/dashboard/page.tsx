import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDashboardData } from "@/lib/data";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getDashboardData(user.workspaceId);
  return <DashboardView data={data} />;
}
