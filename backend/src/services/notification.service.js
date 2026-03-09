const { prisma } = require('../utils/index.util');
const { REGISTRATION_STATUS, EVENT_STATUS } = require('../constants/index.constants');

const HOURS_24_MS = 24 * 60 * 60 * 1000;

const listMyNotifications = async (userId, options = {}) => {
    const limit = Math.min(Number(options.limit) || 20, 50);
    const now = new Date();

    const registrations = await prisma.registration.findMany({
        where: { userId },
        include: {
            event: {
                select: {
                    id: true,
                    name: true,
                    startDateTime: true,
                    status: true,
                    venue: {
                        select: {
                            name: true,
                            location: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    const notifications = registrations.flatMap((registration) => {
        const event = registration.event;
        if (!event) {
            return [];
        }

        const eventStart = new Date(event.startDateTime);
        const timeToEvent = eventStart.getTime() - now.getTime();
        const timestamp = eventStart.toISOString();

        if (registration.status === REGISTRATION_STATUS.PENDING) {
            return [{
                id: `reg-pending-${registration.id}`,
                title: 'Registration pending',
                message: `Your registration for ${event.name} is awaiting approval.`,
                time: timestamp,
                read: false,
                eventId: event.id,
            }];
        }

        if (registration.status === REGISTRATION_STATUS.REJECTED) {
            return [{
                id: `reg-rejected-${registration.id}`,
                title: 'Registration update',
                message: `Your registration for ${event.name} was not approved.`,
                time: timestamp,
                read: false,
                eventId: event.id,
            }];
        }

        if (event.status === EVENT_STATUS.CANCELLED) {
            return [{
                id: `event-cancelled-${registration.id}`,
                title: 'Event cancelled',
                message: `${event.name} has been cancelled. Please check organizer updates.`,
                time: timestamp,
                read: false,
                eventId: event.id,
            }];
        }

        if (
            (registration.status === REGISTRATION_STATUS.APPROVED || registration.status === REGISTRATION_STATUS.ALLOCATED)
            && timeToEvent > 0
            && timeToEvent <= HOURS_24_MS
        ) {
            const venueLabel = event.venue?.name || event.venue?.location || 'the event venue';
            return [{
                id: `event-reminder-${registration.id}`,
                title: 'Event reminder',
                message: `${event.name} starts within 24 hours at ${venueLabel}.`,
                time: timestamp,
                read: false,
                eventId: event.id,
            }];
        }

        if (
            (registration.status === REGISTRATION_STATUS.APPROVED || registration.status === REGISTRATION_STATUS.ALLOCATED)
            && event.status === EVENT_STATUS.COMPLETED
        ) {
            return [{
                id: `event-completed-${registration.id}`,
                title: 'Event completed',
                message: `${event.name} has ended. Please share your feedback in Ratings.`,
                time: timestamp,
                read: false,
                eventId: event.id,
            }];
        }

        return [];
    });

    return notifications
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, limit);
};

module.exports = {
    listMyNotifications,
};
