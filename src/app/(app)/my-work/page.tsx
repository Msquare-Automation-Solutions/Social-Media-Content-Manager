import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listTasks, getTaskOptions } from "@/lib/data";
import { isAdminRole } from "@/lib/roles";
import { TasksApp } from "@/components/tasks/tasks-app";

export const dynamic = "force-dynamic";

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const [tasks, options] = await Promise.all([
    // Only tasks with a stage assigned to me.
    listTasks(user.workspaceId, { assigneeId: user.id }),
    getTaskOptions(user.workspaceId),
  ]);
  return (
    <TasksApp
      mode="mywork"
      tasks={tasks}
      {...options}
      isAdmin={isAdminRole(user.role)}
      canEdit={user.role !== "VIEWER"}
      meId={user.id}
      initialTaskId={sp.task ?? null}
    />
  );
}
