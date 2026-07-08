import { defineConfig, devices } from "@playwright/test";

// Runs the happy-path E2E against the dev server (mock AI stream — no API key
// needed). Reuses an already-running dev server if present.
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Dev-mode compiles each route on first hit, so give assertions headroom.
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // Use the system-installed Google Chrome ("chrome" channel) so CI/dev doesn't
  // need Playwright's bundled Chromium download.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
