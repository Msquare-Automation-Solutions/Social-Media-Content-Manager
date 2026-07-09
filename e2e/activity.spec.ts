import { test, expect, type Page } from "@playwright/test";

// Admin-only activity log: admin actions are recorded and visible on /activity
// with the actor + timestamps and category filtering; a non-admin is blocked.

const ADMIN = { email: "admin@msquare.pro", password: "msquare2026" };

async function login(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function loginOk(page: Page, email: string, password: string) {
  await login(page, email, password);
  await page.waitForURL((u) => u.pathname === "/", { timeout: 20_000 });
  await expect(page.getByText("What are we creating today?")).toBeVisible();
}

test("activity log records actions and is admin-only", async ({ page }) => {
  const email = `act-${Date.now().toString().slice(-8)}@test.co`;
  const name = "Activity Test User";

  // Admin creates a user account → generates an activity entry.
  await loginOk(page, ADMIN.email, ADMIN.password);
  await page.goto("/members");
  await page.getByRole("button", { name: "＋ Add account" }).click();
  await page.getByLabel("Account name").fill(name);
  await page.getByPlaceholder("person@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill("userpass111");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator(`[data-email="${email}"]`)).toBeVisible({ timeout: 15_000 });

  // Activity page shows it: actor Admin + description + the target.
  await page.goto("/activity");
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  const entry = page.locator("div", { hasText: `created account “${name}”` }).last();
  await expect(entry).toBeVisible();
  await expect(page.getByText("just now").first()).toBeVisible();

  // Filter by Content → the account entry disappears; back to All → returns.
  await page.getByLabel("Type").selectOption("content");
  await expect(page.getByText(`created account “${name}”`)).toHaveCount(0);
  await page.getByLabel("Type").selectOption("");
  await expect(page.getByText(`created account “${name}”`).first()).toBeVisible();

  // A non-admin cannot reach /activity (server-side notFound gate).
  await loginOk(page, email, "userpass111");
  await page.goto("/activity");
  await expect(page.getByRole("heading", { name: "Activity" })).toHaveCount(0);

  // Cleanup: admin deletes the test user (reassigned to admin).
  await loginOk(page, ADMIN.email, ADMIN.password);
  await page.goto("/members");
  const row = page.locator(`[data-email="${email}"]`);
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Reassign & Delete" }).click();
  await expect(page.getByText(/account deleted/)).toBeVisible();
});
