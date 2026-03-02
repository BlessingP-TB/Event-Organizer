const { PrismaClient } = require('../../prisma/generate/prisma');

const prisma = new PrismaClient();

module.exports = prisma;
