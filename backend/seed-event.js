require('dotenv').config();
const { PrismaClient } = require('./prisma/generate/prisma');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedEvent() {
    try {
        console.log('🌱 Starting event seeding...');

        // 1. Create or find a venue
        let venue = await prisma.venue.findFirst();
        if (!venue) {
            venue = await prisma.venue.create({
                data: {
                    name: 'Main Auditorium',
                    location: 'TUT Polokwane Campus, Building A',
                    capacity: 500,
                    type: 'AUDITORIUM',
                    rateType: 'PER_DAY',
                    price: 5000,
                    depositValue: 1000,
                    rating: 4,
                },
            });
            console.log('✅ Created venue:', venue.name);
        } else {
            console.log('✅ Using existing venue:', venue.name);
        }

        // 2. Create or find a theme
        let theme = await prisma.theme.findFirst();
        if (!theme) {
            theme = await prisma.theme.create({
                data: {
                    name: 'Technology & Innovation',
                    description: 'Events focused on technology, innovation, and digital transformation',
                    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
                },
            });
            console.log('✅ Created theme:', theme.name);
        } else {
            console.log('✅ Using existing theme:', theme.name);
        }

        // 3. Create or find an organizer user
        let organizer = await prisma.user.findFirst({
            where: { role: 'ORGANIZER' },
            include: { account: true },
        });

        if (!organizer) {
            const passwordHash = await bcrypt.hash('Organizer@123', 10);
            organizer = await prisma.user.create({
                data: {
                    email: 'organizer@tut.ac.za',
                    name: 'Event Organizer',
                    role: 'ORGANIZER',
                    cellphone_number: '+27123456789',
                    address: 'TUT Polokwane Campus',
                    account: {
                        create: {
                            passwordHash,
                            emailVerified: true,
                        },
                    },
                },
                include: { account: true },
            });
            console.log('✅ Created organizer:', organizer.email);
        } else {
            console.log('✅ Using existing organizer:', organizer.email);
        }

        // 4. Check if event already exists
        const existingEvent = await prisma.event.findFirst({
            where: {
                name: 'Tech Innovation Summit 2026',
            },
        });

        if (existingEvent) {
            console.log('⚠️  Event already exists:', existingEvent.name);
            console.log('Event ID:', existingEvent.id);
            return;
        }

        // 5. Create the event
        const startDateTime = new Date();
        startDateTime.setDate(startDateTime.getDate() + 7); // Event starts in 7 days
        startDateTime.setHours(9, 0, 0, 0);

        const endDateTime = new Date(startDateTime);
        endDateTime.setHours(17, 0, 0, 0);

        const event = await prisma.event.create({
            data: {
                name: 'Tech Innovation Summit 2026',
                description: 'Join us for an exciting day of technology presentations, networking, and innovation. Learn about the latest trends in AI, IoT, and digital transformation from industry experts.',
                startDateTime,
                endDateTime,
                status: 'PUBLISHED',
                expectedAttend: 300,
                totalTickets: 300,
                isFree: true,
                ticketRequired: true,
                autoDistribute: true,
                allowAttendeePurchase: false,
                venueId: venue.id,
                organizerId: organizer.id,
                themeId: theme.id,
            },
        });

        console.log('✅ Created event:', event.name);
        console.log('   Event ID:', event.id);
        console.log('   Start Date:', event.startDateTime);

        // 6. Create a free ticket definition for the event
        const ticketDef = await prisma.ticketDefinition.create({
            data: {
                eventId: event.id,
                name: 'General Admission',
                price: 0,
                quantity: 300,
            },
        });

        console.log('✅ Created ticket definition:', ticketDef.name);

        console.log('\n🎉 Event seeding completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   - Venue:', venue.name);
        console.log('   - Theme:', theme.name);
        console.log('   - Organizer:', organizer.email);
        console.log('   - Event:', event.name);
        console.log('   - Status:', event.status);
        console.log('   - Start:', event.startDateTime.toLocaleString());
        console.log('\n✨ The event should now appear on the attendee dashboard!');

    } catch (error) {
        console.error('❌ Error seeding event:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedEvent()
    .then(() => {
        console.log('\n✅ Seed script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Seed script failed:', error);
        process.exit(1);
    });
