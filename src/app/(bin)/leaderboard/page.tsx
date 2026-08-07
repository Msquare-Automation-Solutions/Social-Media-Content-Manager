import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBinLeaderboard } from "@/lib/data";
import { LeaderboardView } from "@/components/content-bin/leaderboard-view";

export const dynamic = "force-dynamic";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** `?month=YYYY-MM` for a month, `?month=all` for all time; defaults to this month. */
export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month =
    sp.month === "all" ? "" : /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : thisMonth;

  const rows = await getBinLeaderboard(user.workspaceId, month || undefined);

  const [y, m] = (month || thisMonth).split("-").map(Number);
  const monthLabel = `${MONTHS[m - 1]} ${y}`;

  return (
    <LeaderboardView rows={rows} meId={user.id} month={month} monthLabel={monthLabel} />
  );
}
