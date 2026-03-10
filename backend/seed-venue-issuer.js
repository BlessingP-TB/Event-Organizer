/**
 * Seed script: creates a VenueIssuer in the database.
 * Run with:  node seed-venue-issuer.js
 */
const { PrismaClient } = require('./prisma/generate/prisma');

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.venueIssuer.findFirst();
  if (existing) {
    console.log('VenueIssuer already exists:', existing.id);
    return;
  }

  const issuer = await prisma.venueIssuer.create({
    data: {
      institutionName: 'Smart Events Institution',
      institutionAddress: ['123 Main Street', 'City, State 12345'],
      otherDetails: ['VAT: 123456789', 'Registration: ABC123']
    }
  });

  console.log('VenueIssuer created successfully!');
  console.log('  ID:', issuer.id);
  console.log('  Name:', issuer.institutionName);
}

main()
  .catch((err) => {
    console.error('Failed to seed VenueIssuer:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
