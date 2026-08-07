/**
 * Admin password reset, for when nobody knows the current password.
 *
 * The app's own change-password flow needs the existing password, and the
 * "forgot password" flow emails a link — which goes nowhere until src/lib/mailer.ts
 * actually sends (today it only logs). This is the fallback: whoever holds
 * DATABASE_URL can rotate an account's password directly.
 *
 *   npx tsx --env-file=.env scripts/reset-password.ts admin@msquare.pro
 *
 * Generates a strong password, prints it once, and stamps passwordChangedAt so
 * every existing session for that account is signed out (see the session callback
 * in src/lib/auth.ts). Pass --password=... to choose your own instead.
 */
import { randomBytes } from "crypto";
import { prisma } from "../src/lib/db";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../src/lib/password";

function generate(): string {
  // Base64 minus the characters that get mangled when copied out of a terminal.
  return randomBytes(18).toString("base64").replace(/[+/=]/g, "").slice(0, 20);
}

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"))?.toLowerCase();
  const chosen = args.find((a) => a.startsWith("--password="))?.slice("--password=".length);

  if (!email) {
    console.error("Usage: npx tsx --env-file=.env scripts/reset-password.ts <email> [--password=...]");
    process.exit(1);
  }
  if (chosen && chosen.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, disabledAt: true },
  });
  if (!user) {
    console.error(`No account found for ${email}.`);
    process.exit(1);
  }

  const password = chosen ?? generate();
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), passwordChangedAt: new Date() },
  });

  console.log(`\n  Account:  ${user.name} <${user.email}>`);
  if (!chosen) console.log(`  Password: ${password}`);
  else console.log(`  Password: (the one you supplied)`);
  console.log(`\n  Save it in a password manager — it isn't stored anywhere else.`);
  console.log(`  Every existing session for this account has been signed out.`);
  if (user.disabledAt) console.log(`\n  NOTE: this account is deactivated and still cannot sign in.`);
  console.log();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => prisma.$disconnect());
