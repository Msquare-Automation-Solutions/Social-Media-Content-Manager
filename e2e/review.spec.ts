import { test, expect } from "@playwright/test";

// Review queue tree: an admin generates + saves an item (lands PENDING),
// opens the /review tree, drills Platform → Category → item, approves it —
// after which it drops out of the queue — then marks it published and confirms
// it shows up on the Published gallery.

test("review queue tree: drill in, approve, then publish", async ({ page }) => {
  const platform = `RQ-${Date.now().toString().slice(-6)}`;
  const title = "Automating Lead Capture with Make.com";

  // Login (admin)
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill("admin@msquare.pro");
  await page.getByPlaceholder("••••••••").fill("msquare2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 20_000 });
  await expect(page.getByText("What are we creating today?")).toBeVisible();

  // Generate a blog post and Save it under a fresh platform → PENDING
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
  await expect(page.getByText("Saved to Articles ✓")).toBeVisible();

  // Open the review tree and drill into the freshly-created platform group.
  // Only the first group auto-expands, so scope to this platform's card and
  // expand it (then its Articles category) explicitly.
  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
  const groupCard = page.locator(".rounded-card").filter({ hasText: platform });
  await expect(groupCard).toBeVisible();
  const item = groupCard.getByRole("button", { name: new RegExp(title) });
  if (!(await item.isVisible())) {
    await groupCard.getByRole("button", { name: new RegExp(platform) }).click();
    await groupCard.getByRole("button", { name: /Articles/ }).click();
  }
  await expect(item).toBeVisible();

  // Open the drawer and Approve
  await item.click();
  const approve = page.getByRole("button", { name: /Approve/ });
  await expect(approve).toBeVisible();
  await approve.click();
  await expect(page.getByText("Approved ✓")).toBeVisible();

  // The drawer refetches → now APPROVED, so an admin can mark it published.
  const publish = page.getByRole("button", { name: /Mark as published/ });
  await expect(publish).toBeVisible();
  await publish.click();
  await expect(page.getByText("Marked as published ✓")).toBeVisible();

  // Close the drawer; this platform has nothing left in the queue, so its whole
  // group drops out of the tree.
  await page.keyboard.press("Escape");
  await expect(page.locator(".rounded-card").filter({ hasText: platform })).toHaveCount(0);

  // It now appears on the Published gallery.
  await page.goto("/published");
  await expect(page.getByRole("heading", { name: "Published" })).toBeVisible();
  await expect(page.getByText(title).first()).toBeVisible();
});
