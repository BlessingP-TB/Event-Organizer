// src/services/event.service.js
const {
    prisma,
    ApiError,
    getPagination,
    createPaginatedResponse,
} = require('../utils/index.util');
const { app } = require('../configs/index.config');
const {
    HTTP_STATUS,
    EVENT_STATUS,
    PURCHASE_STATUS,
    APPROVAL_STATUS,
    APPROVAL_TYPE,
} = require('../constants/index.constants');
const venueService = require('./venue.service.js');
const bookingService = require('./booking.service.js');
const notificationService = require('./notification.service');

const checkVenueAvailability = async (
    venueId,
    startDateTime,
    endDateTime,
    eventIdToExclude = null,
    tx = prisma
) => {
    const coolingHours = app.coolingBreakHours;
    const effectiveStart = new Date(
        new Date(startDateTime).getTime() - coolingHours * 60 * 60 * 1000
    );
    const effectiveEnd = new Date(
        new Date(endDateTime).getTime() + coolingHours * 60 * 60 * 1000
    );

    const whereClause = {
        venueId,
        status: {
            in: [
                EVENT_STATUS.PUBLISHED,
                EVENT_STATUS.ONGOING,
                EVENT_STATUS.COMPLETED,
            ],
        },
        deletedAt: null,
        AND: [
            { startDateTime: { lt: effectiveEnd } },
            { endDateTime: { gt: effectiveStart } },
        ],
    };

    if (eventIdToExclude) {
        whereClause.id = { not: eventIdToExclude };
    }

    const conflictingEvents = await tx.event.count({ where: whereClause });

    if (conflictingEvents > 0) {
        throw new ApiError(
            HTTP_STATUS.CONFLICT,
            'The selected venue is unavailable for the requested time slot (including cooling breaks).',
            'VENUE_SLOT_CONFLICT'
        );
    }
};

const createEvent = async (organizerId, eventBody) => {
    // Destructure to separate ticketDefinitions, resources, and services from the rest of the event data
    let { ticketDefinitions, resources, services, ...rest } = eventBody;
    console.log("DEBUG: Raw eventBody received in createEvent:", eventBody); // Debug log
    console.log("DEBUG: Resources array received:", resources); // Debug log
    console.log("DEBUG: Services object received:", services);
    // --- NEW LOGIC: Prepare requestedResourcesAndServices object ---
    // Combine resources (quantities) and services (booleans) into a single object for storage
    const requestedResourcesAndServices = {};
    if (resources && Array.isArray(resources)) {
        console.log("DEBUG: Processing resources array:", resources); // Debug log
        resources.forEach(res => {
            if (res.name && res.quantity !== undefined) {
                // Convert quantity to number if it's a string (e.g., from form input)
                const quantityNum = Number(res.quantity);
                if (!isNaN(quantityNum)) { // Ensure it's a valid number
                    requestedResourcesAndServices[res.name] = quantityNum;
                    console.log(`DEBUG: Added resource ${res.name}: ${quantityNum}`); // Debug log
                } else {
                    console.warn(`DEBUG: Invalid quantity for resource ${res.name}: ${res.quantity}`); // Debug log
                }
            } else {
                console.warn(`DEBUG: Invalid resource object:`, res); // Debug log
            }
        });
    } else {
        console.log("DEBUG: No 'resources' array found in eventBody or it's not an array.", resources); // Debug log
    }

    if (services && typeof services === 'object' && !Array.isArray(services)) { // Ensure it's an object, not an array
        console.log("DEBUG: Processing services object:", services); // Debug log
        Object.entries(services).forEach(([serviceName, isEnabled]) => {
            // Ensure the value is a boolean
            requestedResourcesAndServices[serviceName] = !!isEnabled;
            console.log(`DEBUG: Added service ${serviceName}: ${!!isEnabled}`); // Debug log
        });
    } else {
        console.log("DEBUG: No 'services' object found in eventBody or it's not an object.", services); // Debug log
    }

    console.log("DEBUG: Final requestedResourcesAndServices object:", requestedResourcesAndServices); // Debug log
    // --- END OF NEW LOGIC ---

    // If no ticket definitions were provided by the organizer...
    if (!ticketDefinitions || ticketDefinitions.length === 0) {
        if (rest.isFree) {
            ticketDefinitions = [{
                name: 'General Admission',
                price: 0.00,
                quantity: rest.expectedAttend || 1000,
            }];
        } else {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Paid events must have at least one ticket definition.");
        }
    }

    const { venueId, themeId, startDateTime, endDateTime } = rest;
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    const venue = await venueService.getVenueById(venueId);

    return prisma.$transaction(async (tx) => {
        const event = await tx.event.create({
            data: {
                ...rest,
                status: EVENT_STATUS.PUBLISHED,
                organizerId,
                venueId,
                themeId,
                startDateTime: startDate,
                endDateTime: endDate,
                // Store the combined resources and services object as JSON
                requestedResourcesAndServices: requestedResourcesAndServices, 
                ticketDefinitions: {
                    create: ticketDefinitions.map((def) => ({
                        name: def.name,
                        price: def.price,
                        quantity: def.quantity,
                    })),
                },
            },
            include: {
                ticketDefinitions: true,
            },
        });

        await bookingService.createEventBooking(
            event.id,
            organizerId,
            venue,
            startDate,
            endDate,
            tx
        );

        const organizerProfile = await tx.organizerProfile.findUnique({
            where: { userId: organizerId },
            select: { id: true },
        });

        await tx.approval.create({
            data: {
                targetType: 'Event',
                targetId: event.id,
                type: APPROVAL_TYPE.GENERAL,
                status: APPROVAL_STATUS.APPROVED,
                notes: 'Auto-approved on creation for immediate attendee visibility.',
                event: {
                    connect: { id: event.id },
                },
                ...(organizerProfile
                    ? {
                          organizerProfile: {
                              connect: { id: organizerProfile.id },
                          },
                      }
                    : {}),
            },
        });

        return event;
    });
};

const listPublicEvents = async (queryOptions) => {
    const { name, location, themeName } = queryOptions;
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const whereClause = {
        status: {
            in: [
                EVENT_STATUS.PUBLISHED,
                EVENT_STATUS.ONGOING,
                EVENT_STATUS.COMPLETED,
            ],
        },
        deletedAt: null,
    };

    if (name) {
        whereClause.name = { contains: name };
    }
    if (location) {
        whereClause.venue = {
            location: { contains: location },
        };
    }
    if (themeName) {
        whereClause.Theme = {
            name: { contains: themeName },
        };
    }

    const query = {
        where: whereClause,
        skip,
        take,
        orderBy: { startDateTime: 'asc' },
        include: {
            venue: { select: { name: true, location: true } },
            organizer: { select: { id: true, name: true } },
            Theme: { select: { name: true, imageUrl: true } },
            ticketDefinitions: {
                where: { deletedAt: null },
                select: { id: true, name: true, price: true, quantity: true },
            },
        },
    };

    const [events, totalItems] = await prisma.$transaction([
        prisma.event.findMany(query),
        prisma.event.count({ where: query.where }),
    ]);

    return createPaginatedResponse(events, totalItems, page, pageSize);
};

const listOrganizerEvents = async (organizerId, queryOptions) => {
    const { includeThemeImage = false } = queryOptions;
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    // Include all events (including soft-deleted) so frontend can filter by status
    const whereClause = {
        organizerId,
    };

    const themeInclude = includeThemeImage
        ? {
              select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                  image: true,
              },
          }
        : undefined;

    const query = {
        where: whereClause,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
            venue: { select: { name: true, location: true } },
            ...(themeInclude ? { Theme: themeInclude } : {}),
            booking: { include: { invoice: true } },
            _count: {
                select: { registrations: true, tickets: true, purchases: true },
            },
            approvals: {
                orderBy: {
                    createdAt: 'desc',
                },
                include: {
                    approver: { select: { id: true, name: true, email: true } }
                }
            },
        },
    };

    const [events, totalItems] = await prisma.$transaction([
        prisma.event.findMany(query),
        prisma.event.count({ where: query.where }),
    ]);

    return createPaginatedResponse(events, totalItems, page, pageSize);
};

const listAdminEvents = async (queryOptions) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const whereClause = { deletedAt: null };

    const query = {
        where: whereClause,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
            venue: { select: { name: true } },
            organizer: { select: { name: true, email: true } },
            approvals: {
                orderBy: {
                    createdAt: 'desc',
                },
                include: {
                    approver: { select: { id: true, name: true, email: true } }
                }
            },
        },
    };

    const [events, totalItems] = await prisma.$transaction([
        prisma.event.findMany(query),
        prisma.event.count({ where: query.where }),
    ]);

    return createPaginatedResponse(events, totalItems, page, pageSize);
};

const getEventById = async (eventId) => {
  const event = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
    include: {
      venue: { include: { tools: true } },
      organizer: { select: { id: true, name: true, email: true } },
      Theme: { 
        select: { 
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          image: true, // ✅ Explicitly include image
        } 
      },
      ticketDefinitions: {
        where: { deletedAt: null },
      },
      booking: { include: { invoice: true } },
      approvals: {
        orderBy: { createdAt: 'desc' },
        include: {
          approver: { select: { id: true, name: true, email: true } }
        }
      },
    },
  });
  if (!event) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Event not found.');
  }
  return event;
};

const updateEvent = async (eventId, updateBody) => {
    // Destructure resources and services from the update body
    const { venueId, startDateTime, endDateTime, isFree, ticketRequired, resources, services } = updateBody;

    const event = await getEventById(eventId);

    if (
        (event.status === EVENT_STATUS.PUBLISHED ||
            event.status === EVENT_STATUS.ONGOING) &&
        (isFree !== undefined || ticketRequired !== undefined)
    ) {
        const paidPurchases = await prisma.purchase.count({
            where: {
                eventId,
                status: PURCHASE_STATUS.COMPLETED,
                amount: { gt: 0 },
            },
        });
        if (
            paidPurchases > 0 &&
            (isFree === true || ticketRequired === false)
        ) {
            throw new ApiError(
                HTTP_STATUS.CONFLICT,
                'Cannot change policy (isFree/ticketRequired) for an event with completed paid purchases. Please refund purchases first or seek admin override.',
                'POLICY_CHANGE_CONFLICT'
            );
        }
    }

    if (
        (venueId || startDateTime || endDateTime) &&
        event.status !== EVENT_STATUS.DRAFT
    ) {
        const newVenueId = venueId || event.venueId;
        const newStart = new Date(startDateTime || event.startDateTime);
        const newEnd = new Date(endDateTime || event.endDateTime);
        await checkVenueAvailability(newVenueId, newStart, newEnd, eventId);
    }

    // --- NEW LOGIC: Prepare updated requestedResourcesAndServices object ---
    let updatedData = { ...updateBody };
    if (resources !== undefined || services !== undefined) {
        // Get the current stored resources and services
        const currentRequestedResources = event.requestedResourcesAndServices || {};
        
        // Prepare the new object by merging with existing data
        const newRequestedResourcesAndServices = { ...currentRequestedResources };

        if (resources && Array.isArray(resources)) {
            resources.forEach(res => {
                if (res.name && res.quantity !== undefined) {
                    newRequestedResourcesAndServices[res.name] = Number(res.quantity);
                }
            });
        }
        if (services && typeof services === 'object') {
            Object.entries(services).forEach(([serviceName, isEnabled]) => {
                newRequestedResourcesAndServices[serviceName] = !!isEnabled;
            });
        }
        
        // Update the data object to pass to prisma
        updatedData.requestedResourcesAndServices = newRequestedResourcesAndServices;
        // Remove the original resources and services from the update object
        // as they are now handled within the JSON field
        delete updatedData.resources; 
        delete updatedData.services;
    }
    // --- END OF NEW LOGIC ---

    return prisma.event.update({
        where: { id: eventId },
        data: updatedData, // Use the updated data object
    });
};

const deleteEvent = async (eventId) => {
    const event = await getEventById(eventId);
    if (![EVENT_STATUS.DRAFT, EVENT_STATUS.PENDING].includes(event.status)) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            'Only DRAFT or PENDING events can be deleted.'
        );
    }

    try {
        // Soft delete: set deletedAt timestamp
        await prisma.event.update({
            where: { id: eventId },
            data: { deletedAt: new Date() },
        });
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Event not found.');
        }
        throw error;
    }
};

// Cleanup function to permanently delete events soft-deleted for over 24 hours
const cleanupDeletedEvents = async () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    await prisma.event.deleteMany({
        where: {
            deletedAt: { not: null, lte: cutoff },
        },
    });
};

const publishEvent = async (eventId) => {
    return prisma.$transaction(async (tx) => {
        const event = await tx.event.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Event not found.');
        }

        if (event.status !== EVENT_STATUS.DRAFT) {
            throw new ApiError(
                HTTP_STATUS.BAD_REQUEST,
                'Only DRAFT events can be published.'
            );
        }

        await checkVenueAvailability(
            event.venueId,
            event.startDateTime,
            event.endDateTime,
            eventId,
            tx
        );

        return tx.event.update({
            where: { id: eventId },
            data: { status: EVENT_STATUS.PUBLISHED },
        });
    });
};

// --- REPAIRED SERVICE FUNCTION ---
const setEventStatus = async (eventId, status, adminId, notes) => {
    return prisma.$transaction(async (tx) => {
        const event = await tx.event.findUnique({ where: { id: eventId } });
        if (!event) {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Event not found.');
        }

        let updatedEvent;

        if (status === EVENT_STATUS.PUBLISHED) {
            await checkVenueAvailability(
                event.venueId,
                event.startDateTime,
                event.endDateTime,
                eventId,
                tx
            );

            const approvalNote =
                notes || `Admin override: immediate publish by ${adminId}`;

            updatedEvent = await tx.event.update({
                where: { id: eventId },
                data: {
                    status: EVENT_STATUS.PUBLISHED,
                    approvals: {
                        create: {
                            targetType: 'Event',
                            targetId: eventId,
                            type: APPROVAL_TYPE.GENERAL,
                            status: APPROVAL_STATUS.APPROVED,
                            notes: approvalNote,
                            approverId: adminId,
                        },
                    },
                },
            });
        } else {
            updatedEvent = await tx.event.update({
                where: { id: eventId },
                data: { status },
            });
        }

        await notificationService.createSystemNotification({
            userId: event.organizerId,
            title: 'Event Status Updated',
            message: `Your event "${event.name}" status is now ${status}.`,
            tx,
        });

        return updatedEvent;
    });
};
// --------------------------------

const listEventTicketDefinitions = async (eventId) => {
    return prisma.ticketDefinition.findMany({
        where: {
            eventId,
            deletedAt: null,
        },
    });
};

const verifyEventOwnership = async (resourceId, userId, model) => {
    let eventId;
    if (model === 'TicketDefinition') {
        const def = await prisma.ticketDefinition.findUnique({
            where: { id: resourceId },
            select: { eventId: true },
        });
        if (!def)
            throw new ApiError(
                HTTP_STATUS.NOT_FOUND,
                'Ticket definition not found.'
            );
        eventId = def.eventId;
    } else {
        eventId = resourceId;
    }

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { organizerId: true },
    });
    if (!event) throw new ApiError(HTTP_STATUS.NOT_FORBIDDEN, 'Forbidden.');
    if (event.organizerId !== userId)
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Forbidden.');
    return event;
};

const addTicketDefinition = async (eventId, defBody, user) => {
    await verifyEventOwnership(eventId, user.id, 'Event');

    return prisma.ticketDefinition.create({
        data: {
            eventId,
            ...defBody,
        },
    });
};

const updateTicketDefinition = async (defId, defBody, user) => {
    await verifyEventOwnership(defId, user.id, 'TicketDefinition');

    const ticketsSold = await prisma.ticket.count({
        where: { ticketDefinitionId: defId },
    });
    if (
        defBody.quantity &&
        ticketsSold > 0 &&
        defBody.quantity < ticketsSold
    ) {
        throw new ApiError(
            HTTP_STATUS.CONFLICT,
            `Cannot reduce quantity below tickets already sold (${ticketsSold}).`
        );
    }

    return prisma.ticketDefinition.update({
        where: { id: defId },
        data: defBody,
    });
};

const deleteTicketDefinition = async (defId, user) => {
    await verifyEventOwnership(defId, user.id, 'TicketDefinition');

    const ticketsSold = await prisma.ticket.count({
        where: { ticketDefinitionId: defId },
    });
    if (ticketsSold > 0) {
        throw new ApiError(
            HTTP_STATUS.CONFLICT,
            'Cannot delete ticket definition with tickets already sold. Please soft-delete (archive) instead.'
        );
    }

    await prisma.ticketDefinition.delete({
        where: { id: defId },
    });
};

module.exports = {
    createEvent,
    listPublicEvents,
    listOrganizerEvents,
    listAdminEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    publishEvent,
    setEventStatus,
    checkVenueAvailability,
    listEventTicketDefinitions,
    addTicketDefinition,
    updateTicketDefinition,
    deleteTicketDefinition,
};