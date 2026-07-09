import { readFileSync } from "fs";
import { resolve } from "path";

// Shared guard for the E2E harness: resolves the *test* database URL and refuses
// to run against production. Used by both playwright.config.ts (to point the
// test server at the branch) and scripts/e2e-db-setup.ts (to migrate + seed it).

function parseEnvFile(path: string): Record<string, string> {
  let raw = "";
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return {};
  }
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const eq = s.indexOf("=");
    if (eq === -1) continue;
    const key = s.slice(0, eq).trim();
    let val = s.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

// host + database name — the identity we compare so a branch on the same host
// but different db (or vice-versa) is still caught if it collides with prod.
function dbIdentity(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * The database URL the E2E suite must use. Throws (aborting the run) if no test
 * DB is configured, or if it resolves to the same host+db as production — so
 * tests can never again write to real data.
 */
export function resolveTestDatabaseUrl(): string {
  const root = process.cwd();
  const test = parseEnvFile(resolve(root, ".env.test"));
  const prod = parseEnvFile(resolve(root, ".env"));

  const testUrl = test.TEST_DATABASE_URL || test.DATABASE_URL;
  if (!testUrl) {
    throw new Error(
      "\n E2E aborted — no isolated test database configured.\n" +
        " Create a throwaway Postgres (a Neon branch is easiest: Neon console →\n" +
        " Branches → New branch) and put its connection string in .env.test as\n" +
        " TEST_DATABASE_URL (see .env.test.example). Then:  npm run e2e:db\n" +
        " This guard exists so the suite never writes to your production database.\n",
    );
  }

  const prodUrl = process.env.DATABASE_URL || prod.DATABASE_URL;
  if (prodUrl && dbIdentity(prodUrl) === dbIdentity(testUrl)) {
    throw new Error(
      "\n E2E aborted — TEST_DATABASE_URL matches your PRODUCTION database.\n" +
        " Point it at a separate Neon branch (a different endpoint) so tests\n" +
        " cannot pollute real data.\n",
    );
  }

  return testUrl;
}
