/**
 * Campus Admin Service
 * Handles campus-wide event management, policy setting, analytics, and multi-campus coordination
 * For Department Heads and Campus Management roles
 */

const {
    prisma,
    ApiError,
    getPagination,
    createPaginatedResponse,
} = require('../utils/index.util');
const { HTTP_STATUS, EVENT_STATUS, APPROVAL_STATUS, BOOKING_STATUS } = require('../constants/index.constants');

// ==================== CAMPUS MANAGEMENT ====================

/**
 * Create a new campus
 */
const createCampus = async (data) => {
    const { name, code, address, description } = data;
    
    const existingCampus = await prisma.campus.findFirst({
        where: { OR: [{ name }, { code }] }
    });
    
    if (existingCampus) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Campus with this name or code already exists');
    }
    
    return prisma.campus.create({
        data: { name, code, address, description }
    });
};

/**
 * List all campuses
 */
const listCampuses = async (queryOptions = {}) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const { query: searchString, isActive } = queryOptions;
    
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (searchString) {
        where.OR = [
            { name: { contains: searchString } },
            { code: { contains: searchString } },
        ];
    }
    
    const [campuses, totalItems] = await prisma.$transaction([
        prisma.campus.findMany({
            skip,
            take,
            where,
            orderBy: { name: 'asc' },
            include: {
                adminAssignments: true,
                venueAssignments: true,
            }
        }),
        prisma.campus.count({ where })
    ]);
    
    return createPaginatedResponse(campuses, totalItems, page, pageSize);
};

/**
 * Update campus details
 */
const updateCampus = async (campusId, data) => {
    return prisma.campus.update({
        where: { id: campusId },
        data
    });
};

/**
 * Assign admin to campus
 */
const assignAdminToCampus = async (campusId, userId, isPrimary = false) => {
    return prisma.campusAdminAssignment.upsert({
        where: { campusId_userId: { campusId, userId } },
        update: { isPrimary },
        create: { campusId, userId, isPrimary }
    });
};

/**
 * Remove admin from campus
 */
const removeAdminFromCampus = async (campusId, userId) => {
    return prisma.campusAdminAssignment.delete({
        where: { campusId_userId: { campusId, userId } }
    });
};

/**
 * Assign venue to campus
 */
const assignVenueToCampus = async (campusId, venueId) => {
    return prisma.campusVenueAssignment.upsert({
        where: { campusId_venueId: { campusId, venueId } },
        update: {},
        create: { campusId, venueId }
    });
};

// ==================== POLICY MANAGEMENT ====================

/**
 * Create a new policy
 */
const createPolicy = async (data, userId) => {
    const { name, category, description, content, effectiveFrom, effectiveUntil } = data;
    
    return prisma.policy.create({
        data: {
            name,
            category,
            description,
            content,
            effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
            effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
            createdById: userId,
        }
    });
};

/**
 * List all policies with filtering
 */
const listPolicies = async (queryOptions = {}) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const { category, isActive } = queryOptions;
    
    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const [policies, totalItems] = await prisma.$transaction([
        prisma.policy.findMany({
            skip,
            take,
            where,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.policy.count({ where })
    ]);
    
    return createPaginatedResponse(policies, totalItems, page, pageSize);
};

/**
 * Update policy
 */
const updatePolicy = async (policyId, data, userId) => {
    return prisma.policy.update({
        where: { id: policyId },
        data: {
            ...data,
            updatedById: userId,
        }
    });
};

/**
 * Delete policy
 */
const deletePolicy = async (policyId) => {
    return prisma.policy.delete({
        where: { id: policyId }
    });
};

/**
 * Get active policies by category
 */
const getActivePoliciesByCategory = async (category) => {
    const now = new Date();
    return prisma.policy.findMany({
        where: {
            category,
            isActive: true,
            effectiveFrom: { lte: now },
            OR: [
                { effectiveUntil: null },
                { effectiveUntil: { gte: now } }
            ]
        },
        orderBy: { effectiveFrom: 'desc' }
    });
};

// ==================== STRATEGIC ANALYTICS ====================

/**
 * Get event engagement analytics
 */
const getEventEngagementAnalytics = async (options = {}) => {
    const { startDate, endDate, campusId } = options;
    
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    
    const eventWhere = {
        deletedAt: null,
        ...(Object.keys(dateFilter).length && { startDateTime: dateFilter })
    };
    
    // Get total events and their engagement
    const [
        totalEvents,
        eventsByStatus,
        registrationStats,
        attendanceStats,
        avgTicketsPerEvent
    ] = await prisma.$transaction([
        prisma.event.count({ where: eventWhere }),
        prisma.event.groupBy({
            by: ['status'],
            _count: { id: true },
            where: eventWhere
        }),
        prisma.registration.aggregate({
            _count: { id: true },
            where: { event: eventWhere }
        }),
        prisma.attendance.aggregate({
            _count: { id: true },
            where: { event: eventWhere }
        }),
        prisma.ticket.groupBy({
            by: ['eventId'],
            _count: { id: true },
            where: { event: eventWhere }
        })
    ]);
    
    const avgTickets = avgTicketsPerEvent.length > 0
        ? avgTicketsPerEvent.reduce((sum, e) => sum + e._count.id, 0) / avgTicketsPerEvent.length
        : 0;
    
    return {
        totalEvents,
        eventsByStatus: eventsByStatus.reduce((acc, s) => {
            acc[s.status] = s._count.id;
            return acc;
        }, {}),
        totalRegistrations: registrationStats._count.id,
        totalAttendance: attendanceStats._count.id,
        averageTicketsPerEvent: Math.round(avgTickets * 100) / 100,
        engagementRate: totalEvents > 0 
            ? Math.round((attendanceStats._count.id / registrationStats._count.id) * 10000) / 100 
            : 0
    };
};

/**
 * Get event success metrics
 */
const getEventSuccessMetrics = async (options = {}) => {
    const { startDate, endDate } = options;
    
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    
    const eventWhere = {
        deletedAt: null,
        status: { in: [EVENT_STATUS.COMPLETED, EVENT_STATUS.ONGOING] },
        ...(Object.keys(dateFilter).length && { startDateTime: dateFilter })
    };
    
    // Get events with their metrics
    const events = await prisma.event.findMany({
        where: eventWhere,
        include: {
            registrations: { select: { status: true } },
            attendance: { select: { status: true } },
            tickets: { select: { redeemed: true } },
            venue: { select: { capacity: true, name: true } },
        }
    });
    
    const metrics = events.map(event => {
        const totalRegistrations = event.registrations.length;
        const totalAttendance = event.attendance.length;
        const ticketsSold = event.tickets.length;
        const ticketsRedeemed = event.tickets.filter(t => t.redeemed).length;
        const capacityUtilization = event.venue?.capacity 
            ? (totalAttendance / event.venue.capacity) * 100 
            : 0;
        
        return {
            eventId: event.id,
            eventName: event.name,
            venue: event.venue?.name,
            totalRegistrations,
            totalAttendance,
            ticketsSold,
            ticketsRedeemed,
            capacityUtilization: Math.round(capacityUtilization * 100) / 100,
            attendanceRate: totalRegistrations > 0 
                ? Math.round((totalAttendance / totalRegistrations) * 10000) / 100 
                : 0,
            redemptionRate: ticketsSold > 0 
                ? Math.round((ticketsRedeemed / ticketsSold) * 10000) / 100 
                : 0
        };
    });
    
    // Aggregate metrics
    const aggregated = {
        totalEventsAnalyzed: metrics.length,
        averageCapacityUtilization: metrics.length > 0
            ? Math.round(metrics.reduce((sum, m) => sum + m.capacityUtilization, 0) / metrics.length * 100) / 100
            : 0,
        averageAttendanceRate: metrics.length > 0
            ? Math.round(metrics.reduce((sum, m) => sum + m.attendanceRate, 0) / metrics.length * 100) / 100
            : 0,
        averageRedemptionRate: metrics.length > 0
            ? Math.round(metrics.reduce((sum, m) => sum + m.redemptionRate, 0) / metrics.length * 100) / 100
            : 0,
        topPerformingEvents: metrics
            .sort((a, b) => b.capacityUtilization - a.capacityUtilization)
            .slice(0, 5)
    };
    
    return { metrics, aggregated };
};

/**
 * Get campus-wide resource utilization
 */
const getResourceUtilization = async (options = {}) => {
    const { startDate, endDate, campusId } = options;
    
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    
    // Get venue utilization
    const venueUtilization = await prisma.venue.findMany({
        where: { deletedAt: null },
        include: {
            bookings: {
                where: {
                    status: { in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING_PAYMENT] },
                    ...(Object.keys(dateFilter).length && { createdAt: dateFilter })
                },
                select: { id: true, calculatedCost: true }
            },
            events: {
                where: {
                    deletedAt: null,
                    ...(Object.keys(dateFilter).length && { startDateTime: dateFilter })
                },
                select: { id: true }
            }
        }
    });
    
    return venueUtilization.map(venue => ({
        venueId: venue.id,
        venueName: venue.name,
        capacity: venue.capacity,
        totalBookings: venue.bookings.length,
        totalEvents: venue.events.length,
        totalRevenue: venue.bookings.reduce((sum, b) => sum + Number(b.calculatedCost || 0), 0)
    }));
};

// ==================== COMPLIANCE MONITORING ====================

/**
 * Get compliance overview
 */
const getComplianceOverview = async () => {
    const [
        pendingApprovals,
        approvalsByType,
        recentRejections,
        pendingDocuments
    ] = await prisma.$transaction([
        prisma.approval.count({ where: { status: APPROVAL_STATUS.PENDING } }),
        prisma.approval.groupBy({
            by: ['type', 'status'],
            _count: { id: true }
        }),
        prisma.approval.findMany({
            where: { 
                status: APPROVAL_STATUS.REJECTED,
                updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
            },
            take: 10,
            orderBy: { updatedAt: 'desc' },
            include: {
                event: { select: { id: true, name: true } }
            }
        }),
        prisma.document.count({ 
            where: { status: 'PENDING', deletedAt: null }
        })
    ]);
    
    return {
        pendingApprovals,
        pendingDocuments,
        approvalsByType: approvalsByType.reduce((acc, item) => {
            if (!acc[item.type]) acc[item.type] = {};
            acc[item.type][item.status] = item._count.id;
            return acc;
        }, {}),
        recentRejections
    };
};

/**
 * Get events requiring compliance review
 */
const getEventsRequiringReview = async () => {
    return prisma.event.findMany({
        where: {
            deletedAt: null,
            status: EVENT_STATUS.DRAFT,
            approvals: {
                some: { status: APPROVAL_STATUS.PENDING }
            }
        },
        include: {
            approvals: {
                where: { status: APPROVAL_STATUS.PENDING }
            },
            organizer: { select: { id: true, name: true, email: true } },
            venue: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'asc' }
    });
};

module.exports = {
    // Campus Management
    createCampus,
    listCampuses,
    updateCampus,
    assignAdminToCampus,
    removeAdminFromCampus,
    assignVenueToCampus,
    
    // Policy Management
    createPolicy,
    listPolicies,
    updatePolicy,
    deletePolicy,
    getActivePoliciesByCategory,
    
    // Strategic Analytics
    getEventEngagementAnalytics,
    getEventSuccessMetrics,
    getResourceUtilization,
    
    // Compliance
    getComplianceOverview,
    getEventsRequiringReview,
};
