// src/services/event.service.js
const {
    prisma,
    ApiError,
    getPagination,
    createPaginatedResponse,
    generateToken,
    verifyToken,
} = require('../utils/index.util');
const { app } = require('../configs/index.config');
const { jwt } = require('../configs/environment.config');
const {
    HTTP_STATUS,
    EVENT_STATUS,
    PURCHASE_STATUS,
    APPROVAL_STATUS,
    APPROVAL_TYPE,
    ROLES,
    BOOKING_STATUS,
    INVOICE_STATUS,
    REGISTRATION_STATUS,
} = require('../constants/index.constants');
const venueService = require('./venue.service.js');
const bookingService = require('./booking.service.js');
const notificationService = require('./notification.service');

const WRITTEN_ASSIGN_TARGET_TYPE = 'EventWrittenAssign';
const SCANNER_ACCESS_TOKEN_TYPE = 'SCANNER_ACCESS';
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

const getEventAudienceFaculty = (event) => {
    const rawAudience = event?.requestedResourcesAndServices?.__audienceFaculty;
    return normalizeFacultyAudience(rawAudience) || FACULTY_AUDIENCE.ALL_STUDENTS;
};

const isEventVisibleToFaculty = (event, viewerFaculty) => {
    const eventAudience = getEventAudienceFaculty(event);
    if (eventAudience === FACULTY_AUDIENCE.ALL_STUDENTS) {
        return true;
    }

    if (!viewerFaculty) {
        return false;
    }

    return eventAudience === viewerFaculty;
};

const buildRescheduleApprovalPayload = ({
    startDateTime,
    endDateTime,
    venueId,
    previousStatus,
}) => JSON.stringify({
    s: new Date(startDateTime).toISOString(),
    e: new Date(endDateTime).toISOString(),
    v: venueId,
    p: previousStatus,
});

const buildCancellationApprovalNote = () => 'Organizer cancelled event';

const randomCode = (length = 8) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < length; i += 1) {
        out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
};

const buildWrittenAssignNotes = (expiresAt, credentials) => {
    const compactCreds = credentials.map((cred) => `${cred.u}:${cred.p}`).join(',');
    return `WA1|${expiresAt.getTime()}|${compactCreds}`;
};

const parseWrittenAssignNotes = (notes) => {
    if (!notes || typeof notes !== 'string' || !notes.startsWith('WA1|')) {
        return null;
    }

    const [version, expiresAtMsRaw, credsRaw] = notes.split('|');
    if (version !== 'WA1') return null;

    const expiresAtMs = Number(expiresAtMsRaw);
    if (!expiresAtMs || Number.isNaN(expiresAtMs)) return null;

    const credentials = (credsRaw || '')
        .split(',')
        .filter(Boolean)
        .map((pair) => {
            const [u, p] = pair.split(':');
            return { u, p };
        })
        .filter((cred) => cred.u && cred.p);

    return {
        expiresAt: new Date(expiresAtMs),
        credentials,
    };
};

const extractTicketIdFromScan = (rawValue) => {
    if (!rawValue || typeof rawValue !== 'string') return null;

    const value = rawValue.trim();
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

    if (uuidPattern.test(value) && value.length <= 80) {
        const match = value.match(uuidPattern);
        return match ? match[0] : null;
    }

    try {
        const parsedUrl = new URL(value);
        const ticketId = parsedUrl.searchParams.get('ticketId');
        if (ticketId && uuidPattern.test(ticketId)) return ticketId;
    } catch (error) {
        // Not a URL, continue with regex fallback below.
    }

    const queryMatch = value.match(/ticketId=([0-9a-f-]{36})/i);
    return queryMatch ? queryMatch[1] : null;
};

const ensureScannerAccess = async (eventId, authHeader) => {
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;

    if (!token) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Missing scanner token.');
    }

    const payload = verifyToken(token, jwt.secret);
    if (!payload || payload.type !== SCANNER_ACCESS_TOKEN_TYPE) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid scanner token.');
    }

    if (payload.eventId !== eventId) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Scanner token is not valid for this event.');
    }

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, endDateTime: true, deletedAt: true },
    });

    if (!event || event.deletedAt) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Event not found.');
    }

    if (new Date(event.endDateTime) <= new Date()) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Scanner access has expired because the event has ended.');
    }

    return payload;
};

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
                EVENT_STATUS.DRAFT,
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
    let { ticketDefinitions, resources, services, submitForApproval = true, audienceFaculty, ...rest } = eventBody;
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

    const normalizedAudienceFaculty = normalizeFacultyAudience(audienceFaculty);
    if (!normalizedAudienceFaculty) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            'Audience faculty is required. Choose Management Science, ICT, Engineering(FEBE), or All Students.'
        );
    }

    requestedResourcesAndServices.__audienceFaculty = normalizedAudienceFaculty;

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

    if (startDate <= new Date()) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            'Start date/time must be in the future.'
        );
    }

    const venue = await venueService.getVenueById(venueId);

    return prisma.$transaction(async (tx) => {
        const event = await tx.event.create({
            data: {
                ...rest,
                status: EVENT_STATUS.DRAFT,
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

        if (submitForApproval) {
            await tx.approval.create({
                data: {
                    targetType: 'Event',
                    targetId: event.id,
                    type: APPROVAL_TYPE.GENERAL,
                    status: APPROVAL_STATUS.PENDING,
                    notes: 'Awaiting admin approval.',
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

            await notificationService.createSystemNotification({
                userId: organizerId,
                title: 'Event Submitted',
                message: `Your event "${event.name}" has been submitted and is pending admin approval.`,
                tx,
            });
        } else {
            await notificationService.createSystemNotification({
                userId: organizerId,
                title: 'Draft Saved',
                message: `Your event "${event.name}" was saved as a draft.`,
                tx,
            });
        }

        return event;
    });
};

const submitDraftEventByOrganizer = async (eventId, organizerId) => {
    return prisma.$transaction(async (tx) => {
        const event = await tx.event.findUnique({
            where: { id: eventId },
            include: {
                approvals: {
                    where: { status: APPROVAL_STATUS.PENDING },
                    select: { id: true },
                },
            },
        });

        if (!event || event.deletedAt) {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Event not found.');
        }

        if (event.organizerId !== organizerId) {
            throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Forbidden.');
        }

        if (event.status !== EVENT_STATUS.DRAFT) {
            throw new ApiError(
                HTTP_STATUS.BAD_REQUEST,
                'Only draft events can be submitted for approval.'
            );
        }

        if (event.approvals.length > 0) {
            throw new ApiError(
                HTTP_STATUS.CONFLICT,
                'This event already has a pending approval request.'
            );
        }

        const organizerProfile = await tx.organizerProfile.findUnique({
            where: { userId: organizerId },
            select: { id: true },
        });

        await tx.approval.create({
            data: {
                targetType: 'Event',
                targetId: event.id,
                type: APPROVAL_TYPE.GENERAL,
                status: APPROVAL_STATUS.PENDING,
                notes: 'Awaiting admin approval.',
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

        await notificationService.createSystemRoleNotification({
            role: ROLES.ADMIN,
            title: 'New Event Request Submitted',
            message: `Organizer submitted "${event.name}" for admin review.`,
            tx,
        });

        await notificationService.createSystemNotification({
            userId: organizerId,
            title: 'Event Submitted',
            message: `Your event "${event.name}" has been submitted and is pending admin approval.`,
            tx,
        });

        return event;
    });
};

const listPublicEvents = async (queryOptions) => {
    const { name, location, themeName, viewerFaculty } = queryOptions;
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const normalizedViewerFaculty = normalizeFacultyAudience(viewerFaculty);
    if (viewerFaculty && !normalizedViewerFaculty) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            'Invalid viewer faculty filter. Use MANAGEMENT_SCIENCE, ICT, ENGINEERING_FEBE, or ALL_STUDENTS.'
        );
    }

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

    const events = await prisma.event.findMany(query);

    const visibleEvents = events.filter((event) =>
        isEventVisibleToFaculty(event, normalizedViewerFaculty)
    );

    const totalItems = visibleEvents.length;
    const pagedEvents = visibleEvents.slice(skip, skip + take);

    return createPaginatedResponse(pagedEvents, totalItems, page, pageSize);
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

const assignWrittenScannersByOrganizer = async (eventId, organizerId, staffCount) => {
    const count = Number(staffCount);
    if (!Number.isInteger(count) || count < 2 || count > 4) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Staff count must be between 2 and 4.');
    }

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            name: true,
            organizerId: true,
            status: true,
            endDateTime: true,
            deletedAt: true,
        },
    });

    if (!event || event.deletedAt) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Event not found.');
    }

    if (event.organizerId !== organizerId) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Forbidden.');
    }

    if (![EVENT_STATUS.PUBLISHED, EVENT_STATUS.ONGOING].includes(event.status)) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Written assign is only available for approved events.');
    }

    const expiresAt = new Date(event.endDateTime);
    if (expiresAt <= new Date()) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot assign scanners for an event that has already ended.');
    }

    const credentials = Array.from({ length: count }).map((_, index) => ({
        u: `WA${index + 1}${randomCode(4)}`,
        p: randomCode(8),
    }));

    const notes = buildWrittenAssignNotes(expiresAt, credentials);

    const latestAssignment = await prisma.approval.findFirst({
        where: {
            eventId,
            targetType: WRITTEN_ASSIGN_TARGET_TYPE,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
    });

    if (latestAssignment) {
        await prisma.approval.update({
            where: { id: latestAssignment.id },
            data: {
                status: APPROVAL_STATUS.APPROVED,
                approver: { connect: { id: organizerId } },
                notes,
                targetId: eventId,
                type: APPROVAL_TYPE.GENERAL,
            },
        });
    } else {
        await prisma.approval.create({
            data: {
                targetType: WRITTEN_ASSIGN_TARGET_TYPE,
                targetId: eventId,
                type: APPROVAL_TYPE.GENERAL,
                status: APPROVAL_STATUS.APPROVED,
                approver: { connect: { id: organizerId } },
                notes,
                event: { connect: { id: eventId } },
            },
        });
    }

    return {
        eventId,
        eventName: event.name,
        expiresAt,
        loginPath: `/scanner-login/${eventId}`,
        credentials: credentials.map((cred) => ({
            username: cred.u,
            password: cred.p,
        })),
    };
};

const loginWrittenScanner = async (eventId, username, password) => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            endDateTime: true,
            deletedAt: true,
        },
    });

    if (!event || event.deletedAt) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Event not found.');
    }

    if (new Date(event.endDateTime) <= new Date()) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Scanner login has expired because the event has ended.');
    }

    const assignment = await prisma.approval.findFirst({
        where: {
            eventId,
            targetType: WRITTEN_ASSIGN_TARGET_TYPE,
            status: APPROVAL_STATUS.APPROVED,
        },
        orderBy: { updatedAt: 'desc' },
        select: { notes: true },
    });

    const parsed = parseWrittenAssignNotes(assignment?.notes);
    if (!parsed) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'No written assignment exists for this event.');
    }

    if (parsed.expiresAt <= new Date()) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Scanner login credentials have expired.');
    }

    const matchedCredential = parsed.credentials.find(
        (cred) => cred.u === username && cred.p === password
    );

    if (!matchedCredential) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid scanner username or password.');
    }

    const expiresInSeconds = Math.max(
        1,
        Math.floor((parsed.expiresAt.getTime() - Date.now()) / 1000)
    );

    const accessToken = generateToken(
        {
            eventId,
            scannerUsername: matchedCredential.u,
            role: ROLES.ORGANIZER,
        },
        jwt.secret,
        `${expiresInSeconds}s`,
        SCANNER_ACCESS_TOKEN_TYPE
    );

    return {
        accessToken,
        expiresAt: parsed.expiresAt,
        scannerUsername: matchedCredential.u,
        eventId,
    };
};

const scannerRedeemAttendeeQr = async (eventId, qrData, authHeader) => {
    await ensureScannerAccess(eventId, authHeader);

    const ticketId = extractTicketIdFromScan(qrData);
    if (!ticketId) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid attendee QR code.');
    }

    const ticket = await prisma.ticket.findFirst({
        where: {
            id: ticketId,
            eventId,
            deletedAt: null,
        },
        include: {
            user: {
                select: { id: true, name: true, email: true },
            },
            event: {
                select: {
                    id: true,
                    name: true,
                    startDateTime: true,
                    endDateTime: true,
                },
            },
        },
    });

    if (!ticket) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Ticket not found for this event.');
    }

    if (!ticket.userId || !ticket.user) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Ticket is not linked to an attendee account.');
    }

    if (ticket.redeemed) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'This attendee ticket has already been used.');
    }

    const { startOffsetHours, endOffsetHours } = app.ticketRedemptionWindow;
    const now = new Date();
    const redemptionStart = new Date(new Date(ticket.event.startDateTime).getTime() - startOffsetHours * 60 * 60 * 1000);
    const redemptionEnd = new Date(new Date(ticket.event.endDateTime).getTime() + endOffsetHours * 60 * 60 * 1000);

    if (now < redemptionStart || now > redemptionEnd) {
        throw new ApiError(
            HTTP_STATUS.UNPROCESSABLE_ENTITY,
            `Scanning is only allowed between ${redemptionStart.toISOString()} and ${redemptionEnd.toISOString()}.`
        );
    }

    const redeemedAt = new Date();

    await prisma.$transaction([
        prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                redeemed: true,
                redeemedAt,
            },
        }),
        prisma.attendance.upsert({
            where: {
                userId_eventId: {
                    userId: ticket.userId,
                    eventId,
                },
            },
            update: {
                status: 'ATTENDED',
                checkedAt: redeemedAt,
            },
            create: {
                userId: ticket.userId,
                eventId,
                status: 'ATTENDED',
                checkedAt: redeemedAt,
            },
        }),
    ]);

    return {
        valid: true,
        message: 'Attendee validated and checked in successfully.',
        attendee: {
            id: ticket.user.id,
            name: ticket.user.name,
            email: ticket.user.email,
        },
        ticket: {
            id: ticket.id,
            type: ticket.type,
            price: ticket.price,
        },
        event: {
            id: ticket.event.id,
            name: ticket.event.name,
        },
        checkedAt: redeemedAt,
    };
};

const deleteNowEventByOrganizer = async (eventId, organizerId) => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            organizerId: true,
            status: true,
            deletedAt: true,
        },
    });

    if (!event) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Event not found.');
    }

    if (event.organizerId !== organizerId) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Forbidden.');
    }

    if (!event.deletedAt && event.status !== EVENT_STATUS.CANCELLED) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            'Delete Now is only available for cancelled or deleted events.'
        );
    }

    // Mark as expired for organizer Cancelled tab so it disappears immediately.
    const hiddenAt = new Date(Date.now() - 21 * 60 * 1000);

    return prisma.event.update({
        where: { id: eventId },
        data: { deletedAt: hiddenAt },
    });
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

const cancelEventByOrganizer = async (eventId, organizerId, reason) => {
    return prisma.$transaction(async (tx) => {
        const event = await tx.event.findUnique({
            where: { id: eventId },
            include: {
                booking: {
                    include: { invoice: true },
                },
            },
        });

        if (!event || event.deletedAt) {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Event not found.');
        }

        if (event.organizerId !== organizerId) {
            throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Forbidden.');
        }

        if (event.status === EVENT_STATUS.CANCELLED) {
            throw new ApiError(
                HTTP_STATUS.CONFLICT,
                'Event is already cancelled.'
            );
        }

        if (
            [EVENT_STATUS.ONGOING, EVENT_STATUS.COMPLETED].includes(event.status)
        ) {
            throw new ApiError(
                HTTP_STATUS.BAD_REQUEST,
                'Only upcoming approved events can be cancelled by organizer.'
            );
        }

        const refundPurchaseCount = await tx.purchase.count({
            where: {
                eventId,
                deletedAt: null,
                status: PURCHASE_STATUS.COMPLETED,
            },
        });

        const updatedEvent = await tx.event.update({
            where: { id: eventId },
            data: {
                status: EVENT_STATUS.CANCELLED,
                deletedAt: new Date(),
            },
        });

        if (event.booking && event.booking.status !== BOOKING_STATUS.CANCELLED) {
            await tx.booking.update({
                where: { id: event.booking.id },
                data: {
                    status: BOOKING_STATUS.CANCELLED,
                    ...(event.booking.invoice
                        ? {
                              invoice: {
                                  update: {
                                      status: INVOICE_STATUS.CANCELLED,
                                  },
                              },
                          }
                        : {}),
                },
            });
        }

        await tx.registration.updateMany({
            where: {
                eventId,
                status: { not: REGISTRATION_STATUS.CANCELLED },
            },
            data: { status: REGISTRATION_STATUS.CANCELLED },
        });

        await tx.approval.create({
            data: {
                targetType: 'EventCancellation',
                targetId: eventId,
                type: APPROVAL_TYPE.GENERAL,
                status: APPROVAL_STATUS.APPROVED,
                notes: buildCancellationApprovalNote(),
                approverId: organizerId,
                event: { connect: { id: eventId } },
            },
        }).catch(() => null);

        const refundMessage = refundPurchaseCount > 0
            ? ` Refund processing is required for ${refundPurchaseCount} completed purchase${refundPurchaseCount === 1 ? '' : 's'}.`
            : '';

        await notificationService.createSystemRoleNotification({
            role: ROLES.ADMIN,
            title: 'Event Cancelled By Organizer',
            message: `Event "${event.name}" was cancelled by organizer. Reason: ${reason}.${refundMessage}`,
            tx,
        });

        await notificationService.createSystemNotification({
            userId: organizerId,
            title: 'Event Cancelled',
            message: refundPurchaseCount > 0
                ? `Your event "${event.name}" was cancelled and removed from listings. Admin has been notified and refund processing is pending for ${refundPurchaseCount} completed purchase${refundPurchaseCount === 1 ? '' : 's'}.`
                : `Your event "${event.name}" was cancelled and removed from listings. Admin has been notified.`,
            tx,
        });

        return {
            ...updatedEvent,
            refundPending: refundPurchaseCount > 0,
            refundPurchaseCount,
        };
    });
};

const requestRescheduleByOrganizer = async (eventId, organizerId, requestBody) => {
    const { startDateTime, endDateTime, venueId, reason } = requestBody;

    return prisma.$transaction(async (tx) => {
        const event = await tx.event.findUnique({ where: { id: eventId } });

        if (!event || event.deletedAt) {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Event not found.');
        }

        if (event.organizerId !== organizerId) {
            throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Forbidden.');
        }

        if (event.status !== EVENT_STATUS.PUBLISHED) {
            throw new ApiError(
                HTTP_STATUS.BAD_REQUEST,
                'Only approved/published events can be rescheduled.'
            );
        }

        const pendingReschedule = await tx.approval.findFirst({
            where: {
                eventId,
                targetType: 'EventReschedule',
                status: APPROVAL_STATUS.PENDING,
            },
            select: { id: true },
        });

        if (pendingReschedule) {
            throw new ApiError(
                HTTP_STATUS.CONFLICT,
                'A reschedule request is already pending admin approval.'
            );
        }

        const approval = await tx.approval.create({
            data: {
                targetType: 'EventReschedule',
                targetId: eventId,
                type: APPROVAL_TYPE.GENERAL,
                status: APPROVAL_STATUS.PENDING,
                notes: buildRescheduleApprovalPayload({
                    startDateTime,
                    endDateTime,
                    venueId: venueId || event.venueId,
                    previousStatus: event.status,
                }),
                event: { connect: { id: eventId } },
            },
        });

        await tx.event.update({
            where: { id: eventId },
            data: { status: EVENT_STATUS.PENDING },
        });

        await notificationService.createSystemRoleNotification({
            role: ROLES.ADMIN,
            title: 'Event Reschedule Requested',
            message: `Organizer requested reschedule for event "${event.name}".`,
            tx,
        });

        return approval;
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
    deleteNowEventByOrganizer,
    publishEvent,
    setEventStatus,
    checkVenueAvailability,
    listEventTicketDefinitions,
    addTicketDefinition,
    updateTicketDefinition,
    deleteTicketDefinition,
    cancelEventByOrganizer,
    requestRescheduleByOrganizer,
    submitDraftEventByOrganizer,
    assignWrittenScannersByOrganizer,
    loginWrittenScanner,
    scannerRedeemAttendeeQr,
};