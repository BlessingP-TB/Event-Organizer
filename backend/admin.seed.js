require('dotenv').config();
const { PrismaClient } = require('./prisma/generate/prisma');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const {
        ADMIN_SEED_EMAIL,
        ADMIN_SEED_NAME,
        ADMIN_SEED_PASSWORD,
        ADMIN_SEED_PHONE,
        BCRYPT_ROUNDS,
    } = process.env;

    if (!ADMIN_SEED_EMAIL || !ADMIN_SEED_NAME || !ADMIN_SEED_PASSWORD || !ADMIN_SEED_PHONE) {
        console.error('Error: ADMIN_SEED_EMAIL, ADMIN_SEED_NAME, ADMIN_SEED_PASSWORD, and ADMIN_SEED_PHONE must be set in .env');
        process.exit(1);
    }

    const existing = await prisma.user.findUnique({ where: { email: ADMIN_SEED_EMAIL } });
    if (existing) {
        console.log(`User with email ${ADMIN_SEED_EMAIL} already exists. No changes made.`);
        return;
    }

    const rounds = parseInt(BCRYPT_ROUNDS || '10', 10);
    const passwordHash = await bcrypt.hash(ADMIN_SEED_PASSWORD, rounds);

    const user = await prisma.user.create({
        data: {
            email: ADMIN_SEED_EMAIL,
            name: ADMIN_SEED_NAME,
            role: 'ADMIN',
            cellphone_number: ADMIN_SEED_PHONE,
            account: {
                create: {
                    passwordHash,
                    emailVerified: true,
                },
            },
        },
    });

    console.log('✅ Admin user created successfully (seed).');
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Phone: ${user.cellphone_number}`);
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
