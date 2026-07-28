import { prisma } from "@/lib/db";

// One-off: make a user a "super admin" — OWNER role + may approve their own work.
// Usage: npx tsx scripts/set-super-admin.ts <email>
async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Pass an email: npx tsx scripts/set-super-admin.ts <email>");
  const user = await prisma.user.update({
    where: { email },
    data: { canSelfApprove: true },
    select: { id: true, name: true },
  });
  const m = await prisma.membership.updateMany({
    where: { userId: user.id },
    data: { role: "OWNER" },
  });
  console.log(`✓ ${user.name} (${email}) is now a super admin — OWNER, canSelfApprove. Memberships updated: ${m.count}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
