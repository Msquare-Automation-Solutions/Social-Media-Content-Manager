import { redirect } from "next/navigation";

// Approved used to be an asset gallery here. Ready-to-publish is now a
// task-level view (one row per task, with all its stage files), so keep this
// path working for old links/bookmarks and send it there.
export default function ApprovedRedirect() {
  redirect("/tasks/ready");
}
