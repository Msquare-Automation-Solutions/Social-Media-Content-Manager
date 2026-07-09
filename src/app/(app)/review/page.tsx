import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getReviewQueue } from "@/lib/data";
import { isAdminRole } from "@/lib/roles";
import { ReviewTree } from "@/components/review/review-tree";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const queue = await getReviewQueue(user.workspaceId);
  return (
    <ReviewTree
      queue={queue}
      canEdit={user.role !== "VIEWER"}
      canReview={isAdminRole(user.role)}
    />
  );
}
