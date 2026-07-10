import { test, expect } from "@playwright/test";

// Approved gallery: a card grid of every approved asset, filterable, opening
// the detail drawer. Seeded content is all APPROVED, so the grid is populated.

test("approved gallery renders, filters, and opens a card", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill("admin@msquare.pro");
  await page.getByPlaceholder("••••••••").fill("msquare2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 20_000 });

  // Reach it via the sidebar link (proves it's wired for everyone).
  await page.getByRole("link", { name: "Approved" }).click();
  await page.waitForURL((u) => u.pathname === "/approved", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Approved" })).toBeVisible();

  // Cards render.
  const cards = page.locator(".card-lift");
  await expect(cards.first()).toBeVisible();

  // Filter to Blog posts — grid still shows cards (seeded blog posts are approved).
  await page.getByLabel("Category").selectOption("BLOGPOST");
  await expect(page).toHaveURL(/type=BLOGPOST/);
  await expect(cards.first()).toBeVisible();

  // Open a card → detail drawer (blog posts are documents with no Download, so
  // assert a control present for every asset type).
  await cards.first().click();
  await expect(page.getByRole("button", { name: /Edit tags & fields/ })).toBeVisible();
});
