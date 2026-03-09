// src/services/venue.service.js
const {
    prisma,
    ApiError,
    getPagination,
    createPaginatedResponse,
} = require('../utils/index.util');
const { HTTP_STATUS, EVENT_STATUS, VENUE_TYPE } = require('../constants/index.constants');
const { app } = require('../configs/index.config');

const createVenue = async (venueBody) => {
    // This function expects venueBody to be an object like { name, location, imageUrls: [...] }
    // This will now be provided correctly by the controller after Multer processing
    const { type, typeOther, imageUrls, ...rest } = venueBody;

    const data = {
        ...rest,
        type,
        typeOther: type === VENUE_TYPE.OTHER ? typeOther : null,
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
    };

    try {
        return await prisma.venue.create({
            data,
            include: { tools: true } // Optional: Return the venue with tools attached
        });
    } catch (error) {
        // ... existing error handling ...
        if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
            throw new ApiError(HTTP_STATUS.CONFLICT, 'A venue with this name already exists.', 'VENUE_NAME_CONFLICT');
        }
        throw error;
    }
};

const listAllVenues = async (queryOptions) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const query = {
        skip,
        take,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
    };

    const [venues, totalItems] = await prisma.$transaction([
        prisma.venue.findMany(query),
        prisma.venue.count({ where: query.where }),
    ]);

    return createPaginatedResponse(venues, totalItems, page, pageSize);
};

const listPublicVenues = async (queryOptions) => {
    const {
        tools,
        toolsMode = 'ANY',
        capacityMin,
        capacityMax,
        location,
    } = queryOptions;
    const { skip, take, page, pageSize } = getPagination(queryOptions);

    const whereClause = {
        deletedAt: null,
    };

    if (capacityMin) {
        whereClause.capacity = { ...whereClause.capacity, gte: +capacityMin };
    }
    if (capacityMax) {
        whereClause.capacity = { ...whereClause.capacity, lte: +capacityMax };
    }
    if (location) {
        whereClause.location = { contains: location };
    }

    if (tools) {
        const toolNamesOrIds = Array.isArray(tools) ? tools : [tools];
        const toolFilter = {
            [toolsMode.toUpperCase() === 'ALL' ? 'every' : 'some']: {
                OR: [
                    { id: { in: toolNamesOrIds } },
                    { name: { in: toolNamesOrIds } },
                ],
            },
        };
        whereClause.tools = toolFilter;
    }

    const query = {
        skip,
        take,
        where: whereClause,
        include: { tools: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
    };

    const [venues, totalItems] = await prisma.$transaction([
        prisma.venue.findMany(query),
        prisma.venue.count({ where: query.where }),
    ]);

    return createPaginatedResponse(venues, totalItems, page, pageSize);
};

const getVenueById = async (venueId) => {
    const venue = await prisma.venue.findFirst({
        where: { id: venueId, deletedAt: null },
        include: { tools: true },
    });
    if (!venue) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Venue not found.');
    }
    return venue;
};

const updateVenue = async (venueId, updateBody) => {
    // This function expects updateBody to be an object like { name, location, imageUrls: [...] }
    // This will now be provided correctly by the controller after Multer processing
    const { type, typeOther, imageUrls, ...rest } = updateBody;

    const data = { ...rest };

    if (type) {
        data.type = type;
        data.typeOther = type === VENUE_TYPE.OTHER ? typeOther : null;
    }

    if (imageUrls !== undefined) {
        data.imageUrls = Array.isArray(imageUrls) ? imageUrls : [];
    }

    try {
        return await prisma.venue.update({
            where: { id: venueId },
            data,
            include: { tools: true }
        });
    } catch (error) {
        // ... existing error handling ...
        if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
            throw new ApiError(HTTP_STATUS.CONFLICT, 'A venue with this name already exists.', 'VENUE_NAME_CONFLICT');
        }
        if (error.code === 'P2025') {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Venue not found.');
        }
        throw error;
    }
};

const deleteVenue = async (venueId) => {
    try {
        await prisma.venue.update({
            where: { id: venueId },
            data: { deletedAt: new Date() },
        });
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Venue not found.');
        }
        throw error;
    }
};

const updateVenueTools = async (venueId, { add = [], remove = [] }) => {
    return prisma.venue.update({
        where: { id: venueId },
        data: {
            tools: {
                connect: add.map((id) => ({ id })),
                disconnect: remove.map((id) => ({ id })),
            },
        },
        include: { tools: true },
    });
};

const getBookedSlots = async (venueId, from, to) => {
    const coolingHours = app.coolingBreakHours;

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const events = await prisma.event.findMany({
        where: {
            venueId,
            status: { notIn: [EVENT_STATUS.CANCELLED] },
            deletedAt: null,
            AND: [
                {
                    startDateTime: {
                        lt: new Date(toDate.getTime() + coolingHours * 60 * 60 * 1000),
                    },
                },
                {
                    endDateTime: {
                        gt: new Date(fromDate.getTime() - coolingHours * 60 * 60 * 1000),
                    },
                },
            ],
        },
        select: {
            startDateTime: true,
            endDateTime: true,
        },
    });

    return events.map((event) => ({
        start: new Date(
            event.startDateTime.getTime() - coolingHours * 60 * 60 * 1000
        ),
        end: new Date(event.endDateTime.getTime() + coolingHours * 60 * 60 * 1000),
    }));
};

module.exports = {
    createVenue,
    listAllVenues,
    listPublicVenues,
    getVenueById,
    updateVenue,
    deleteVenue,
    updateVenueTools,
    getBookedSlots,
};