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

const FACULTY_AUDIENCE = Object.freeze({
    ALL_STUDENTS: 'ALL_STUDENTS',
    MANAGEMENT_SCIENCE: 'MANAGEMENT_SCIENCE',
    ICT: 'ICT',
    ENGINEERING_FEBE: 'ENGINEERING_FEBE',
});

const normalizeFacultyAudience = (value) => {
    if (!value) return null;
    const normalized = String(value).trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (normalized === 'ENGINEERING' || normalized === 'FEBE') {
        return FACULTY_AUDIENCE.ENGINEERING_FEBE;
    }
    return Object.values(FACULTY_AUDIENCE).includes(normalized) ? normalized : null;
};

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

    const attendee = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, address: true },
    });

    const eventAudience =
        normalizeFacultyAudience(event?.requestedResourcesAndServices?.__audienceFaculty) ||
        FACULTY_AUDIENCE.ALL_STUDENTS;

    if (attendee?.role === ROLES.ATTENDEE && eventAudience !== FACULTY_AUDIENCE.ALL_STUDENTS) {
        const attendeeFaculty = normalizeFacultyAudience(attendee?.address);
        if (!attendeeFaculty || attendeeFaculty !== eventAudience) {
            throw new ApiError(
                HTTP_STATUS.FORBIDDEN,
                'This event is restricted to a different faculty audience.'
            );
        }
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
                    endDateTime: true,
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

const getOrganizerRegistrationReport = async (organizerId) => {
    const events = await prisma.event.findMany({
        where: {
            organizerId,
            deletedAt: null,
        },
        orderBy: { startDateTime: 'desc' },
        select: {
            id: true,
            name: true,
            status: true,
            startDateTime: true,
            endDateTime: true,
            venue: {
                select: {
                    name: true,
                    location: true,
                },
            },
            registrations: {
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    userId: true,
                    status: true,
                    createdAt: true,
                    source: true,
                    requestedTicket: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            cellphone_number: true,
                        },
                    },
                    ticket: {
                        select: {
                            id: true,
                            type: true,
                            price: true,
                            issuedAt: true,
                            redeemed: true,
                            redeemedAt: true,
                        },
                    },
                },
            },
            attendance: {
                select: {
                    userId: true,
                    status: true,
                    checkedAt: true,
                },
            },
        },
    });

    const eventReports = events.map((event) => {
        const attendanceByUserId = new Map(
            event.attendance.map((attendance) => [attendance.userId, attendance])
        );

        const attendees = event.registrations.map((registration) => {
            const attendance = attendanceByUserId.get(registration.userId) || null;

            return {
                registrationId: registration.id,
                attendeeId: registration.user.id,
                attendeeName: registration.user.name,
                attendeeEmail: registration.user.email,
                attendeePhone: registration.user.cellphone_number,
                registrationStatus: registration.status,
                registeredAt: registration.createdAt,
                registrationSource: registration.source,
                requestedTicket: registration.requestedTicket,
                ticketIssued: Boolean(registration.ticket),
                ticketId: registration.ticket?.id || null,
                ticketType: registration.ticket?.type || null,
                ticketPrice: registration.ticket?.price || null,
                ticketIssuedAt: registration.ticket?.issuedAt || null,
                ticketRedeemed: Boolean(registration.ticket?.redeemed),
                ticketRedeemedAt: registration.ticket?.redeemedAt || null,
                attendanceStatus: attendance?.status || null,
                checkedAt: attendance?.checkedAt || null,
            };
        });

        const totals = attendees.reduce(
            (accumulator, attendee) => {
                accumulator.totalRegistrations += 1;

                if (attendee.registrationStatus === REGISTRATION_STATUS.PENDING) {
                    accumulator.pendingRegistrations += 1;
                }

                if (attendee.registrationStatus === REGISTRATION_STATUS.APPROVED) {
                    accumulator.approvedRegistrations += 1;
                }

                if (attendee.registrationStatus === REGISTRATION_STATUS.ALLOCATED) {
                    accumulator.allocatedRegistrations += 1;
                }

                if (attendee.registrationStatus === REGISTRATION_STATUS.REJECTED) {
                    accumulator.rejectedRegistrations += 1;
                }

                if (attendee.registrationStatus === REGISTRATION_STATUS.CANCELLED) {
                    accumulator.cancelledRegistrations += 1;
                }

                if (attendee.ticketIssued) {
                    accumulator.ticketIssuedCount += 1;
                }

                if (attendee.ticketRedeemed) {
                    accumulator.ticketRedeemedCount += 1;
                }

                if (attendee.attendanceStatus) {
                    accumulator.checkedInCount += 1;
                }

                return accumulator;
            },
            {
                totalRegistrations: 0,
                pendingRegistrations: 0,
                approvedRegistrations: 0,
                allocatedRegistrations: 0,
                rejectedRegistrations: 0,
                cancelledRegistrations: 0,
                ticketIssuedCount: 0,
                ticketRedeemedCount: 0,
                checkedInCount: 0,
            }
        );

        return {
            eventId: event.id,
            eventName: event.name,
            eventStatus: event.status,
            startDateTime: event.startDateTime,
            endDateTime: event.endDateTime,
            venueName: event.venue?.name || null,
            venueLocation: event.venue?.location || null,
            totals,
            attendees,
        };
    });

    const summary = eventReports.reduce(
        (accumulator, eventReport) => {
            accumulator.totalEvents += 1;
            accumulator.totalRegistrations += eventReport.totals.totalRegistrations;
            accumulator.totalPendingRegistrations += eventReport.totals.pendingRegistrations;
            accumulator.totalApprovedRegistrations += eventReport.totals.approvedRegistrations;
            accumulator.totalAllocatedRegistrations += eventReport.totals.allocatedRegistrations;
            accumulator.totalCheckedIn += eventReport.totals.checkedInCount;
            accumulator.totalTicketsRedeemed += eventReport.totals.ticketRedeemedCount;
            return accumulator;
        },
        {
            totalEvents: 0,
            totalRegistrations: 0,
            totalPendingRegistrations: 0,
            totalApprovedRegistrations: 0,
            totalAllocatedRegistrations: 0,
            totalCheckedIn: 0,
            totalTicketsRedeemed: 0,
        }
    );

    const recentActivity = eventReports
        .flatMap((eventReport) =>
            eventReport.attendees.map((attendee) => ({
                eventId: eventReport.eventId,
                eventName: eventReport.eventName,
                attendeeName: attendee.attendeeName,
                attendeeEmail: attendee.attendeeEmail,
                registrationStatus: attendee.registrationStatus,
                attendanceStatus: attendee.attendanceStatus,
                registeredAt: attendee.registeredAt,
                checkedAt: attendee.checkedAt,
            }))
        )
        .sort((left, right) => {
            const leftDate = new Date(left.checkedAt || left.registeredAt).getTime();
            const rightDate = new Date(right.checkedAt || right.registeredAt).getTime();
            return rightDate - leftDate;
        })
        .slice(0, 12);

    return {
        summary,
        events: eventReports,
        recentActivity,
    };
};


module.exports = {
    getRegistrationByUserAndEvent,
    createRegistration,
    listUserRegistrations,
    decideRegistration,
    checkCapacity,
    getApprovedRegistrationsForOrganizer,
    getOrganizerRegistrationReport,
};

