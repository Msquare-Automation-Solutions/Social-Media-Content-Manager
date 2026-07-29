import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { PlatformsManager } from "@/components/platforms/platforms-manager";

export const dynamic = "force-dynamic";

export default async function PlatformsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) notFound();

  const channels = await prisma.socialChannel.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, icon: true, color: true },
  });

  return <PlatformsManager initial={channels} />;
}
