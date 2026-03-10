const { prisma } = require('../utils/index.util'); // Only need the client instance (prisma)

// 2. Add a new direct import for the Decimal class (Requires 'new' keyword)
const { Decimal } = require('@prisma/client/runtime/library');
const {
    PURCHASE_STATUS,
    APPROVAL_STATUS,
    EVENT_STATUS,
    BOOKING_STATUS,
    ATTENDANCE_STATUS,
    REGISTRATION_STATUS,
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

const getAttendeeStats = async (userId) => {
    const today = new Date();

    const totalRegistrations = await prisma.registration.count({
        where: { userId, status: REGISTRATION_STATUS.APPROVED },
    });

    const upcomingEventsCount = await prisma.registration.count({
        where: {
            userId,
            status: REGISTRATION_STATUS.APPROVED,
            event: {
                startDateTime: { gte: today },
                status: { not: EVENT_STATUS.CANCELLED }
            }
        }
    });

    const eventsAttended = await prisma.attendance.count({
        where: { userId, status: ATTENDANCE_STATUS.CHECKED_IN },
    });

    const totalSpentResult = await prisma.purchase.aggregate({
        _sum: { amount: true },
        where: { userId, status: PURCHASE_STATUS.COMPLETED },
    });
    const totalSpent = totalSpentResult._sum.amount || new Decimal(0);

    const transactionHistory = await prisma.purchase.findMany({
        where: {
            userId,
            status: PURCHASE_STATUS.COMPLETED,
            createdAt: {
                gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
            }
        },
        select: { amount: true, createdAt: true }
    });

    const timelineDataMap = {};
    const monthsName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${monthsName[d.getMonth()]}`;
        timelineDataMap[key] = 0;
    }

    transactionHistory.forEach((t) => {
        const d = new Date(t.createdAt);
        const key = monthsName[d.getMonth()];
        if (timelineDataMap[key] !== undefined) {
            timelineDataMap[key] += 1;
        }
    });

    const eventsTimeline = Object.keys(timelineDataMap).map((key) => ({
        name: key,
        count: timelineDataMap[key]
    }));

    const nextEventsRaw = await prisma.registration.findMany({
        where: {
            userId,
            status: REGISTRATION_STATUS.APPROVED,
            event: {
                startDateTime: { gte: today },
                status: { not: EVENT_STATUS.CANCELLED }
            }
        },
        include: {
            event: {
                select: {
                    id: true,
                    name: true,
                    startDateTime: true,
                    venue: { select: { location: true } }
                }
            }
        },
        orderBy: { event: { startDateTime: 'asc' } },
        take: 3
    });

    const nextUpcomingEvents = nextEventsRaw.map((r) => ({
        id: r.event.id,
        name: r.event.name,
        date: r.event.startDateTime,
        location: r.event.venue?.location || 'TBA'
    }));

    const statusCounts = await prisma.registration.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true }
    });

    const ticketStatusSummary = {
        confirmed: 0,
        pending: 0,
        cancelled: 0,
        attended: 0
    };

    statusCounts.forEach((item) => {
        if (item.status === REGISTRATION_STATUS.APPROVED) ticketStatusSummary.confirmed = item._count.status;
        else if (item.status === REGISTRATION_STATUS.PENDING) ticketStatusSummary.pending = item._count.status;
        else if (item.status === REGISTRATION_STATUS.CANCELLED) ticketStatusSummary.cancelled = item._count.status;
    });

    const pendingPurchasesCount = await prisma.purchase.count({
        where: { userId, status: PURCHASE_STATUS.PENDING }
    });

    const pendingTasks = [];
    if (pendingPurchasesCount > 0) {
        pendingTasks.push({ id: 'pending-pay', title: `Complete ${pendingPurchasesCount} pending payment(s)`, action: '/attendee/payments' });
    }
    if (!totalRegistrations) {
        pendingTasks.push({ id: 'explore', title: 'Browse events and register', action: '/attendee/events' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const registrationsLast30Days = await prisma.registration.count({
        where: {
            userId,
            createdAt: { gte: thirtyDaysAgo }
        }
    });

    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    const todayEventsRaw = await prisma.registration.findMany({
        where: {
            userId,
            status: REGISTRATION_STATUS.APPROVED,
            event: {
                startDateTime: { gte: startOfToday, lte: endOfToday }
            }
        },
        include: { event: true }
    });

    const todayEvents = await Promise.all(todayEventsRaw.map(async (r) => {
        const ticket = await prisma.ticket.findUnique({
            where: { registrationId: r.id }
        });
        return {
            id: r.event.id,
            ticketId: r.id,
            ticket,
            name: r.event.name,
            time: r.event.startDateTime
        };
    }));

    return {
        totalRegistrations,
        upcomingEventsCount,
        eventsAttended,
        totalSpent,
        eventsTimeline,
        nextUpcomingEvents,
        ticketStatusSummary,
        pendingTasks,
        registrationsLast30Days,
        todayEvents
    };
};

module.exports = {
    getAdminDashboardStats,
    getFinancialStats,
    getOrganizerStats,
    getAttendeeStats,
};