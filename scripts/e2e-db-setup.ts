import { execSync } from "child_process";
import { resolveTestDatabaseUrl } from "../e2e/test-env";

// Prepares the isolated E2E database (a Neon branch): applies migrations and
// seeds it. Safe by construction — resolveTestDatabaseUrl() refuses to run
// against production. Run with: npm run e2e:db
const url = resolveTestDatabaseUrl();
const env = { ...process.env, DATABASE_URL: url };

const host = (() => {
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable)";
  }
})();

// A freshly-woken Neon branch can drop the first connection while its compute
// cold-starts; retry each step a few times before giving up.
function run(cmd: string, label: string, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    try {
      execSync(cmd, { stdio: "inherit", env });
      return;
    } catch (err) {
      if (i === attempts) throw err;
      console.log(`  … ${label} attempt ${i} failed (likely cold-start), retrying`);
      execSync("sleep 4");
    }
  }
}

console.log(`▶ Preparing E2E test database at ${host}`);
console.log("  • applying migrations…");
run("npx prisma migrate deploy", "migrate");
console.log("  • seeding…");
run("npx prisma db seed", "seed");
console.log("✓ Test database ready.");
