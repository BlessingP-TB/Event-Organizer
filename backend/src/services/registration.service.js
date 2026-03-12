const { prisma, ApiError } = require('../utils/index.util');
const {
    HTTP_STATUS,
    EVENT_STATUS,
    REGISTRATION_STATUS,
    ROLES,
    ERROR_MESSAGES,
} = require('../constants/index.constants');
const eventService = require('./event.service');
const ticketService = require('./ticket.service');
const notificationService = require('./notification.service');

const getCapacity = async (eventId) => {
    const event = await eventService.getEventById(eventId);
    const venue = await prisma.venue.findUnique({
        where: { id: event.venueId },
        select: { capacity: true },
    });

    if (!venue) {
        throw new ApiError(
            HTTP_STATUS.NOT_FOUND,
            'Event venue not found.'
        );
    }

    const [approvedRegistrations, issuedTickets] = await prisma.$transaction([
        prisma.registration.count({
            where: {
                eventId,
                status: REGISTRATION_STATUS.APPROVED,
            },
        }),
        prisma.ticket.count({
            where: {
                eventId,
                deletedAt: null,
            },
        }),
    ]);

    const currentOccupancy = approvedRegistrations + issuedTickets;
    const remainingCapacity = venue.capacity - currentOccupancy;

    return {
        capacity: venue.capacity,
        currentOccupancy,
        remainingCapacity,
    };
};

const checkCapacity = async (eventId) => {
    const { remainingCapacity } = await getCapacity(eventId);
    if (remainingCapacity <= 0) {
        throw new ApiError(
            HTTP_STATUS.CONFLICT,
            'Event has reached its maximum capacity.',
            'EVENT_CAPACITY_REACHED'
        );
    }
};

const getRegistrationByUserAndEvent = async (userId, eventId) => {
    return prisma.registration.findUnique({
        where: { userId_eventId: { userId, eventId } },
    });
};

/*const createRegistration = async (userId, eventId) => {
    const event = await eventService.getEventById(eventId);
    if (event.status !== EVENT_STATUS.PUBLISHED) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            'Registrations are only allowed for published events.'
        );
    }*/
// --- THIS IS THE REPLACED AND UPDATED FUNCTION ---
const createRegistration = async (userId, eventId, registrationBody) => {
    // Step 1: Fetch the event and check its status
    const event = await eventService.getEventById(eventId);
    if (event.status !== EVENT_STATUS.PUBLISHED) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            'Registrations are only allowed for published events.'
        );
    }

    // Step 2: Check for existing registration
    const existingRegistration = await getRegistrationByUserAndEvent(
        userId,
        eventId
    );
    if (existingRegistration) {
        throw new ApiError(
            HTTP_STATUS.CONFLICT,
            'You are already registered for this event.'
        );
    }

    // Step 3: Check event capacity
    await checkCapacity(eventId);

    // Step 4: Check the event's rules for automatic ticket generation
    const isAutomatic = event.isFree && event.ticketRequired && event.autoDistribute;

    if (isAutomatic) {
        // --- AUTOMATIC TICKET WORKFLOW ---
        const freeTicketDef = await prisma.ticketDefinition.findFirst({
            where: { eventId: eventId, price: 0 },
        });

        if (!freeTicketDef) {
            throw new ApiError(
                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                'Event is configured for automatic tickets, but no free ticket definition was found.'
            );
        }

        return prisma.$transaction(async (tx) => {
            const newRegistration = await tx.registration.create({
                data: {
                    userId,
                    eventId,
                    status: REGISTRATION_STATUS.ALLOCATED, // Instantly allocated
                    // Safely access subscribeUpdates from the request body
                },
            });

            const ticketBody = {
                userId: userId,
                registrationId: newRegistration.id,
                ticketDefinitionId: freeTicketDef.id,
            };

            // Call the internal ticket issuing function
            const newTicket = await ticketService.issueTicketInternal(eventId, ticketBody, tx);

            await notificationService.createSystemNotification({
                userId,
                title: 'Registration Completed',
                message: `You are successfully registered for "${event.name}" and your ticket has been issued.`,
                tx,
            });

            // Return both the registration and the ticket
            return { ...newRegistration, ticket: newTicket };
        });

    } else {
        // --- MANUAL APPROVAL WORKFLOW (Original logic) ---
        const pendingRegistration = await prisma.registration.create({
            data: {
                userId,
                eventId,
                status: REGISTRATION_STATUS.PENDING,
            },
        });

        await notificationService.createSystemNotification({
            userId,
            title: 'Registration Submitted',
            message: `Your registration request for "${event.name}" was submitted and is pending approval.`,
        });

        return pendingRegistration;
    }
};
// --- END OF REPLACED FUNCTION ---
/*const existingRegistration = await getRegistrationByUserAndEvent(
    userId,
    eventId
);
if (existingRegistration) {
    throw new ApiError(
        HTTP_STATUS.CONFLICT,
        'User is already registered for this event.'
    );
}*/

/*await checkCapacity(eventId);

return prisma.registration.create({
    data: {
        userId,
        eventId,
        status: REGISTRATION_STATUS.PENDING,
    },
});
};*/

const listUserRegistrations = async (userId) => {
    return prisma.registration.findMany({
        where: { userId },
        include: {
            event: {
                select: {
                    id: true,
                    name: true,
                    startDateTime: true,
                    status: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};

const decideRegistration = async (registrationId, user, { status, notes }) => {
    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
            event: {
                select: { id: true, name: true, organizerId: true },
            },
        },
    });

    if (!registration) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Registration not found.');
    }

    if (user.role === ROLES.ORGANIZER) {
        const event = await prisma.event.findUnique({
            where: { id: registration.eventId },
            select: { organizerId: true },
        });
        if (!event || event.organizerId !== user.id) {
            throw new ApiError(
                HTTP_STATUS.FORBIDDEN,
                ERROR_MESSAGES.FORBIDDEN,
                'NOT_EVENT_ORGANIZER'
            );
        }
    }

    if (
        status === REGISTRATION_STATUS.APPROVED &&
        registration.status !== REGISTRATION_STATUS.APPROVED
    ) {
        await checkCapacity(registration.eventId);
    }

    const updatedRegistration = await prisma.registration.update({
        where: { id: registrationId },
        data: {
            status,
        },
    });

    await notificationService.createSystemNotification({
        userId: registration.userId,
        title: 'Registration Decision',
        message: `Your registration for "${registration.event?.name || 'this event'}" is now ${status}.`,
    });

    return updatedRegistration;
};

const getApprovedRegistrationsForOrganizer = async (organizerId) => {
    // 1️⃣ Fetch all events created by this organizer
    const events = await prisma.event.findMany({
        where: { organizerId, deletedAt: null },
        select: { id: true },
    });
    console.log(events);
    if (!events.length) return 0;

    const eventIds = events.map(e => e.id);

    // 2️⃣ Count registrations with APPROVED status for these events
    const count = await prisma.registration.count({
        where: {
            eventId: { in: eventIds },
            status: REGISTRATION_STATUS.APPROVED,
        },
    });
    console.log(count);
    return count;
};


module.exports = {
    getRegistrationByUserAndEvent,
    createRegistration,
    listUserRegistrations,
    decideRegistration,
    checkCapacity,
    getApprovedRegistrationsForOrganizer,
};

