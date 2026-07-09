import { test, expect, type Page } from "@playwright/test";

// Admin-managed accounts: admin creates a user, that user can log in, admin
// resets their password, deactivates (login blocked), reactivates, then deletes
// with content reassigned. Self-cleaning (the test user is removed at the end).

const ADMIN = { email: "admin@msquare.pro", password: "msquare2026" };

// Always start from a clean session so a lingering cookie can't redirect
// /login → chat mid-test.
async function login(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function loginExpectSuccess(page: Page, email: string, password: string) {
  await login(page, email, password);
  await page.waitForURL((u) => u.pathname === "/", { timeout: 20_000 });
  await expect(page.getByText("What are we creating today?")).toBeVisible();
}

test("admin creates, resets, deactivates, and deletes a user", async ({ page }) => {
  const email = `pwuser-${Date.now().toString().slice(-8)}@test.co`;
  const pw1 = "userpass111";
  const pw2 = "userpass222";

  // 1. Admin logs in and opens Members.
  await loginExpectSuccess(page, ADMIN.email, ADMIN.password);
  await page.goto("/members");

  // 2. Create a User account.
  await page.getByRole("button", { name: "＋ Add account" }).click();
  await page.getByLabel("Account name").fill("PW Test User");
  await page.getByPlaceholder("person@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(pw1);
  await page.getByRole("button", { name: "Create account" }).click();
  const row = page.locator(`[data-email="${email}"]`);
  await expect(row).toBeVisible({ timeout: 15_000 });

  // 3. That user can log in with pw1.
  await loginExpectSuccess(page, email, pw1);

  // 4. Admin resets the user's password to pw2.
  await loginExpectSuccess(page, ADMIN.email, ADMIN.password);
  await page.goto("/members");
  await row.getByRole("button", { name: "Reset PW" }).click();
  await page.getByPlaceholder("••••••••").fill(pw2);
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page.getByText(/Password reset/)).toBeVisible();

  // 5. Old password no longer works.
  await login(page, email, pw1);
  await expect(page.getByText("Invalid email or password.")).toBeVisible();

  // 6. New password works.
  await loginExpectSuccess(page, email, pw2);

  // 7. Admin deactivates the user → login blocked.
  await loginExpectSuccess(page, ADMIN.email, ADMIN.password);
  await page.goto("/members");
  await row.getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByText(/deactivated/)).toBeVisible();
  await login(page, email, pw2);
  await expect(page.getByText("Invalid email or password.")).toBeVisible();

  // 8. Admin reactivates, then deletes with reassign-to-admin.
  await loginExpectSuccess(page, ADMIN.email, ADMIN.password);
  await page.goto("/members");
  await row.getByRole("button", { name: "Reactivate" }).click();
  await expect(page.getByText(/reactivated/)).toBeVisible();
  page.on("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Reassign & Delete" }).click();
  await expect(page.getByText(/account deleted/)).toBeVisible();
  await expect(page.locator(`[data-email="${email}"]`)).toHaveCount(0);
});
