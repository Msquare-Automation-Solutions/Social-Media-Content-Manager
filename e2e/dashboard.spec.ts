import { test, expect, type Page } from "@playwright/test";

// Dashboard is visible to everyone: KPI tiles, the per-platform bar chart, and
// a platform carousel whose manual Next button advances the slide.

const ADMIN = { email: "admin@msquare.pro", password: "msquare2026" };

async function loginOk(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 20_000 });
}

test("dashboard renders KPIs, platform chart, and a working carousel", async ({ page }) => {
  await loginOk(page, ADMIN.email, ADMIN.password);

  // Navigate via the sidebar link (proves it's wired for everyone).
  await page.getByRole("link", { name: "Dashboard" }).click();
  await page.waitForURL((u) => u.pathname === "/dashboard", { timeout: 15_000 });

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // KPI tiles.
  await expect(page.getByText("Scheduled this month")).toBeVisible();
  await expect(page.getByText("Approved").first()).toBeVisible();

  // Per-platform bar chart + breakdowns are present.
  await expect(page.getByRole("heading", { name: "Media files per platform" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "By status" })).toBeVisible();

  // Carousel: the manual Next button advances to a different platform.
  const nextBtn = page.getByRole("button", { name: "Next platform" });
  await expect(nextBtn).toBeVisible();
  await nextBtn.hover(); // entering the carousel pauses auto-advance
  const indicator = page.locator("span").filter({ hasText: /^\d+\/\d+$/ }).first();
  const before = await indicator.textContent();
  await nextBtn.click();
  await expect(indicator).not.toHaveText(before ?? "1/1");
});
