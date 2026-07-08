import { test, expect } from "@playwright/test";

// The spec's Phase 6 happy path:
// login → generate a blog post → Save (adding a new platform inline) →
// filter Blog posts by that platform → edit → version history → delete → restore.

test("full content lifecycle", async ({ page }) => {
  const platform = `PW-${Date.now().toString().slice(-6)}`;

  // 1. Login (shared office account, full access)
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill("team@msquare.pro");
  await page.getByPlaceholder("••••••••").fill("msquare2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  // Login does a hard navigation to "/"; wait for it before asserting.
  await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 });
  await expect(page.getByText("What are we creating today?")).toBeVisible();

  // 2. Generate a blog post via chat (mock stream → blog artifact)
  await page
    .getByPlaceholder("Ask me to create a blog post, thumbnail, video script…")
    .fill("Write a blog post about automating lead capture with Make.com");
  await page.getByRole("button", { name: /Send/ }).click();

  // Artifact card appears with a Save… button
  const saveBtn = page.getByRole("button", { name: "Save…" });
  await expect(saveBtn).toBeVisible({ timeout: 20_000 });

  // 3. Open Save dialog, add a NEW platform inline, then Save
  await saveBtn.click();
  await expect(page.getByText("Save to library")).toBeVisible();
  await page.getByRole("button", { name: "＋ Add platform" }).click();
  await page.getByPlaceholder("Platform name (e.g. Pinterest)").fill(platform);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  // New platform chip is now selected; Save.
  await expect(page.getByText(`Platform “${platform}” added ✓`)).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();

  // Toast confirms + card flips to Saved
  await expect(page.getByText("Saved to Blog posts ✓")).toBeVisible();

  // 4. Go to Blog posts, filter by the new platform
  await page.goto("/blog-posts");
  await page.locator("select").nth(1).selectOption({ label: `✨ ${platform}` });
  const card = page.getByText("Automating Lead Capture with Make.com").first();
  await expect(card).toBeVisible();

  // 5. Open drawer → edit title
  await card.click();
  await expect(page.getByText("Edit tags & fields")).toBeVisible();
  await page.getByRole("button", { name: /Edit tags & fields/ }).click();
  const nameInput = page.getByLabel("Asset name");
  await nameInput.fill("Lead Capture — Edited");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(/Changes saved/)).toBeVisible();

  // 6. Version history shows a snapshot
  await expect(page.getByText(/Version history/)).toBeVisible();

  // 7. Delete (soft)
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Delete/ }).click();
  await expect(page.getByText(/Moved to Trash/)).toBeVisible();

  // 8. Restore from Trash
  await page.goto("/trash");
  const trashCard = page.getByText("Lead Capture — Edited").first();
  await expect(trashCard).toBeVisible();
  await page.getByRole("button", { name: /Restore/ }).first().click();
  await expect(page.getByText(/restored/)).toBeVisible();
});
