import { test, expect } from "@playwright/test";

// Review queue tree: an admin generates + saves an item (lands IN_QUEUE),
// opens the /review tree, drills Platform → Category → item, and approves it —
// after which it drops out of the queue.

test("review queue tree: drill in and approve", async ({ page }) => {
  const platform = `RQ-${Date.now().toString().slice(-6)}`;
  const title = "Automating Lead Capture with Make.com";

  // Login (admin)
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill("admin@msquare.pro");
  await page.getByPlaceholder("••••••••").fill("msquare2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 20_000 });
  await expect(page.getByText("What are we creating today?")).toBeVisible();

  // Generate a blog post and Save it under a fresh platform → IN_QUEUE
  await page
    .getByPlaceholder("Ask me to create a blog post, thumbnail, video script…")
    .fill("Write a blog post about automating lead capture with Make.com");
  await page.getByRole("button", { name: /Send/ }).click();
  const saveBtn = page.getByRole("button", { name: "Save…" });
  await expect(saveBtn).toBeVisible({ timeout: 20_000 });
  await saveBtn.click();
  await expect(page.getByText("Save to library")).toBeVisible();
  await page.getByRole("button", { name: "＋ Add platform" }).click();
  await page.getByPlaceholder("Platform name (e.g. Pinterest)").fill(platform);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(`Platform “${platform}” added ✓`)).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved to Blog posts ✓")).toBeVisible();

  // Open the review tree — the new platform is the only in-queue group, so it
  // (and its first category) auto-expand and the item is visible.
  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
  await expect(page.getByText(platform)).toBeVisible();
  const item = page.getByRole("button", { name: new RegExp(title) });
  await expect(item).toBeVisible();

  // Open the drawer and Approve
  await item.click();
  const approve = page.getByRole("button", { name: /Approve/ });
  await expect(approve).toBeVisible();
  await approve.click();
  await expect(page.getByText("Approved ✓")).toBeVisible();

  // Close the drawer; the approved item is no longer in the queue tree.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: new RegExp(title) })).toHaveCount(0);
});
