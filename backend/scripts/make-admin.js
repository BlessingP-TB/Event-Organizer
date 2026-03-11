const { PrismaClient } = require('../prisma/generate/prisma');

const prisma = new PrismaClient();

function getArg(flag) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  const kv = args.find((a) => a.startsWith(flag + '='));
  if (kv) return kv.split('=')[1];
  return undefined;
}

async function main() {
  const email = getArg('--email');
  const name = getArg('--name');

  if (!email && !name) {
    console.error('Usage: node scripts/make-admin.js --email user@example.com OR --name "Full Name"');
    process.exit(1);
  }

  let user;
  if (email) {
    user = await prisma.user.findUnique({ where: { email } });
  } else {
    user = await prisma.user.findFirst({ where: { name } });
  }

  if (!user) {
    console.error('User not found.');
    process.exit(1);
  }

  if (user.role === 'ADMIN') {
    console.log(`User ${user.name || user.email} is already an ADMIN.`);
    await prisma.$disconnect();
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  console.log(`Success: ${user.name || user.email} is now an ADMIN.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error:', e);
  try { await prisma.$disconnect(); } catch (err) {}
  process.exit(1);
});
