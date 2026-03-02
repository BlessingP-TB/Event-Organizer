const { prisma } = require('../utils/index.util'); // Only need the client instance (prisma)

// 2. Add a new direct import for the Decimal class (Requires 'new' keyword)
const { Decimal } = require('@prisma/client/runtime/library');
const {
    PURCHASE_STATUS,
    APPROVAL_STATUS,
    EVENT_STATUS,
    BOOKING_STATUS,
} = require('../constants/index.constants');

const getAdminDashboardStats = async () => {
    const [
        totalUsers,
        totalRevenueResult,
        pendingApprovals,
        activeEvents,
    ] = await prisma.$transaction([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.purchase.aggregate({
            _sum: { amount: true },
            where: { status: PURCHASE_STATUS.COMPLETED },
        }),
        prisma.approval.count({ where: { status: APPROVAL_STATUS.PENDING } }),
        prisma.event.count({
            where: {
                status: EVENT_STATUS.ONGOING,
                deletedAt: null,
            },
        }),
    ]);

    return {
        totalUsers,
        // ✅ CORRECTED: Use 'new Decimal(0)'
        totalRevenue: totalRevenueResult._sum.amount || new Decimal(0),
        pendingApprovals,
        activeEvents,
    };
};

const getFinancialStats = async (startDate, endDate) => {
    const dateFilter = {
        createdAt: { gte: startDate, lte: endDate },
    };

    const [
        ticketRevenueResult,
        refundsResult,
        bookingRevenueResult,
    ] = await prisma.$transaction([
        prisma.purchase.aggregate({
            _sum: { amount: true },
            where: { ...dateFilter, status: PURCHASE_STATUS.COMPLETED },
        }),
        prisma.purchase.aggregate({
            _sum: { amount: true },
            where: { ...dateFilter, status: PURCHASE_STATUS.REFUNDED },
        }),
        prisma.booking.aggregate({
            _sum: { totalPaid: true },
            where: {
                ...dateFilter,
                status: {
                    in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING_PAYMENT],
                },
            },
        }),
    ]);

    // ✅ CORRECTED: Use 'new Decimal(0)'
    const ticketRevenue = ticketRevenueResult._sum.amount || new Decimal(0);
    const refunds = refundsResult._sum.amount || new Decimal(0);
    const bookingRevenue = bookingRevenueResult._sum.totalPaid || new Decimal(0);
    const netRevenue = ticketRevenue.add(bookingRevenue).sub(refunds);

    return {
        startDate,
        endDate,
        ticketRevenue,
        bookingRevenue,
        refunds,
        netRevenue,
    };
};

const getOrganizerStats = async (organizerId) => {
    const [
        totalEvents,
        totalTicketsSold,
        totalRevenueResult,
        upcomingEvents,
    ] = await prisma.$transaction([
        prisma.event.count({
            where: { organizerId, deletedAt: null },
        }),
        prisma.ticket.count({
            where: { event: { organizerId }, deletedAt: null },
        }),
        prisma.purchase.aggregate({
            _sum: { amount: true },
            where: {
                event: { organizerId },
                status: PURCHASE_STATUS.COMPLETED,
            },
        }),
        prisma.event.count({
            where: {
                organizerId,
                deletedAt: null,
                status: { in: [EVENT_STATUS.PUBLISHED, EVENT_STATUS.ONGOING] },
                startDateTime: { gte: new Date() },
            },
        }),
    ]);

    return {
        totalEvents,
        totalTicketsSold,
        // ✅ CORRECTED: Use 'new Decimal(0)'
        totalRevenue: totalRevenueResult._sum.amount || new Decimal(0),
        upcomingEvents,
    };
};

module.exports = {
    getAdminDashboardStats,
    getFinancialStats,
    getOrganizerStats,
};