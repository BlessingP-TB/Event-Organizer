require('dotenv').config();
const { PrismaClient } = require('./prisma/generate/prisma');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            active: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 25,
    });

    console.log(JSON.stringify(users, null, 2));
    await prisma.$disconnect();
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
});


