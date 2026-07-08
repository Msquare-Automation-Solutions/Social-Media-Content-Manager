import { defineConfig, devices } from "@playwright/test";

// Runs the happy-path E2E against the dev server (mock AI stream — no API key
// needed). Reuses an already-running dev server if present.
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  // One retry absorbs any first-hit dev-compile flake after warming.
  retries: 1,
  // Dev-mode compiles each route on first hit, so give assertions headroom.
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // Use the system-installed Google Chrome ("chrome" channel) so CI/dev doesn't
  // need Playwright's bundled Chromium download.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
  // Run an isolated server on :3100 with MOCK_AI=1 so the happy path is
  // deterministic and never touches the live API — independent of any real-AI
  // dev server you're running on :3000.
  webServer: {
    command: "MOCK_AI=1 PORT=3100 npm run dev",
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
