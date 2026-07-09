import { defineConfig, devices } from "@playwright/test";
import { resolveTestDatabaseUrl } from "./e2e/test-env";

// The suite runs against an ISOLATED test database (a Neon branch), never
// production. resolveTestDatabaseUrl() aborts the run if it's missing or points
// at prod — see e2e/test-env.ts — so tests can't pollute real data.
const TEST_DATABASE_URL = resolveTestDatabaseUrl();

// Runs the happy-path E2E against the dev server (mock AI stream — no API key
// needed). Reuses an already-running dev server if present.
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  // Two retries absorb dev-compile flakes and the odd serverless-branch
  // connection reset after warming.
  retries: 2,
  // Dev-mode compiles each route on first hit and the test branch adds network
  // latency, so give assertions headroom.
  expect: { timeout: 20_000 },
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
    command: "npm run dev",
    // Point the test server at the isolated branch. Next's @next/env does not
    // override variables already present in process.env, so this DATABASE_URL
    // wins over the prod value in .env.
    env: { DATABASE_URL: TEST_DATABASE_URL, MOCK_AI: "1", PORT: "3100" },
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
