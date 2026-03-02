const { prisma, ApiError } = require('../utils/index.util');
const { HTTP_STATUS, ROLES, ERROR_MESSAGES } = require('../constants/index.constants');
const eventService = require('./event.service');

const getReportAndVerifyAccess = async (reportId, user) => {
    const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: { event: { select: { organizerId: true } } },
    });

    if (!report) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Report not found.');
    }

    const isAuthor = report.authorId === user.id;
    const isAdmin = user.role === ROLES.ADMIN;
    const isEventOrganizer = report.event.organizerId === user.id;

    if (!isAuthor && !isAdmin && !isEventOrganizer) {
        throw new ApiError(
            HTTP_STATUS.FORBIDDEN,
            ERROR_MESSAGES.FORBIDDEN,
            'REPORT_ACCESS_DENIED'
        );
    }

    return report;
};

const createReport = async (authorId, eventId, content) => {
    await eventService.getEventById(eventId);

    return prisma.report.create({
        data: {
            eventId,
            authorId,
            content,
        },
    });
};

const listReportsForEvent = async (eventId) => {
    return prisma.report.findMany({
        where: { eventId },
        include: {
            author: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
};

const getReportById = async (id) => {
    const report = await prisma.report.findUnique({
        where: { id },
    });
    if (!report) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Report not found.');
    }
    return report;
};

const updateReport = async (id, content, user) => {
    await getReportAndVerifyAccess(id, user);

    return prisma.report.update({
        where: { id },
        data: { content },
    });
};

const deleteReport = async (id, user) => {
    await getReportAndVerifyAccess(id, user);

    await prisma.report.delete({
        where: { id },
    });
};

const getVenueAnalytics = async () => {
    const data = await prisma.booking.groupBy({
        by: ['venueId'],
        _count: { id: true },                 // number of bookings
        _sum: { calculatedCost: true, totalPaid: true }, // revenue-related sums
    });

    // Include venue names for clarity
    const venueIds = data.map(d => d.venueId);
    const venues = await prisma.venue.findMany({
        where: { id: { in: venueIds } },
        select: { id: true, name: true }
    });

    return data.map(d => {
        const venue = venues.find(v => v.id === d.venueId);
        return {
            venueId: d.venueId,
            venueName: venue?.name ?? 'Unknown',
            totalBookings: d._count.id,
            totalRevenue: d._sum.calculatedCost,
            totalPaid: d._sum.totalPaid,
        };
    });
};
module.exports = {
    createReport,
    listReportsForEvent,
    getReportById,
    updateReport,
    deleteReport,
    getVenueAnalytics,
};

