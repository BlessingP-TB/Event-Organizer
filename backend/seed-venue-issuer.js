const { PrismaClient } = require('./prisma/generate/prisma');

const prisma = new PrismaClient();

async function main() {
    // Check if a VenueIssuer already exists
    const existing = await prisma.venueIssuer.findFirst();
    if (existing) {
        console.log('VenueIssuer already exists:', existing.institutionName);
        return;
    }

    // Create default VenueIssuer for TUT
    const venueIssuer = await prisma.venueIssuer.create({
        data: {
            institutionName: 'Tshwane University of Technology',
            institutionAddress: [
                'Staatsartillerie Rd',
                'Pretoria West',
                'Pretoria',
                '0183',
                'South Africa'
            ],
            otherDetails: [
                'VAT Number: 4123456789',
                'Tel: +27 12 382 5911',
                'Email: general@tut.ac.za'
            ],
            institutionLogoUrl: null
        }
    });

    console.log('VenueIssuer created successfully:');
    console.log('  ID:', venueIssuer.id);
    console.log('  Institution:', venueIssuer.institutionName);
}

main()
    .catch((e) => {
        console.error('Error seeding VenueIssuer:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
