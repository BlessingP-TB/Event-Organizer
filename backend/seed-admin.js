/**
 * Seed script: creates an ADMIN user in the database.
 * Run with:  node seed-admin.js
 */
const { PrismaClient } = require('./prisma/generate/prisma');
const bcrypt = require('bcrypt');
const {
  isAllowedAuthEmail,
  normalizeAuthEmail,
  ALLOWED_AUTH_EMAIL_MESSAGE,
} = require('./src/utils/authEmail.util');

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@tut.ac.za';
const ADMIN_PASSWORD = 'Admin@1234';
const ADMIN_NAME = 'System Admin';
const BCRYPT_ROUNDS = 10;

async function main() {
  const normalizedAdminEmail = normalizeAuthEmail(ADMIN_EMAIL);

  if (!isAllowedAuthEmail(normalizedAdminEmail)) {
    throw new Error(ALLOWED_AUTH_EMAIL_MESSAGE);
  }

  // Check if admin already exists
  const existing = await prisma.user.findUnique({ where: { email: normalizedAdminEmail } });
  if (existing) {
    console.log('Admin user already exists:', existing.email);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: normalizedAdminEmail,
      name: ADMIN_NAME,
      role: 'ADMIN',
      active: true,
      account: {
        create: {
          passwordHash,
          emailVerified: true,   // pre-verified so login works immediately
        },
      },
    },
    include: { account: true },
  });

  console.log('Admin user created successfully!');
  console.log('  ID   :', user.id);
  console.log('  Email:', user.email);
  console.log('  Role :', user.role);
}

main()
  .catch((err) => {
    console.error('Failed to seed admin:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
