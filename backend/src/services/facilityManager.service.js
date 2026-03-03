/**
 * Facility Manager Service
 * Handles venue management, maintenance scheduling, utilization reports, and event setup support
 * For Campus Facility Managers role
 */

const {
    prisma,
    ApiError,
    getPagination,
    createPaginatedResponse,
} = require('../utils/index.util');
const { HTTP_STATUS, BOOKING_STATUS } = require('../constants/index.constants');

// ==================== MAINTENANCE MANAGEMENT ====================

/**
 * Create maintenance schedule
 */
const createMaintenance = async (data, scheduledBy) => {
    const { venueId, title, description, type, scheduledAt, assignedTo, notes, cost } = data;
    
    // Verify venue exists
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Venue not found');
    }
    
    // Check for conflicting bookings on the maintenance date
    const maintenanceDate = new Date(scheduledAt);
    const conflictingBookings = await prisma.booking.findMany({
        where: {
            venueId,
            status: { in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING_PAYMENT] },
            event: {
                startDateTime: {
                    gte: new Date(maintenanceDate.setHours(0, 0, 0, 0)),
                    lte: new Date(maintenanceDate.setHours(23, 59, 59, 999))
                }
            }
        },
        include: { event: { select: { name: true, startDateTime: true } } }
    });
    
    return prisma.venueMaintenance.create({
        data: {
            venueId,
            title,
            description,
            type: type || 'ROUTINE',
            scheduledAt: new Date(scheduledAt),
            scheduledBy,
            assignedTo,
            notes,
            cost: cost ? parseFloat(cost) : null,
        },
        include: { venue: { select: { id: true, name: true } } }
    });
};

/**
 * List maintenance schedules
 */
const listMaintenanceSchedules = async (queryOptions = {}) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const { venueId, status, type, startDate, endDate } = queryOptions;
    
    const where = {};
    if (venueId) where.venueId = venueId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (startDate || endDate) {
        where.scheduledAt = {};
        if (startDate) where.scheduledAt.gte = new Date(startDate);
        if (endDate) where.scheduledAt.lte = new Date(endDate);
    }
    
    const [maintenances, totalItems] = await prisma.$transaction([
        prisma.venueMaintenance.findMany({
            skip,
            take,
            where,
            orderBy: { scheduledAt: 'asc' },
            include: { venue: { select: { id: true, name: true, location: true } } }
        }),
        prisma.venueMaintenance.count({ where })
    ]);
    
    return createPaginatedResponse(maintenances, totalItems, page, pageSize);
};

/**
 * Update maintenance status
 */
const updateMaintenanceStatus = async (id, status, notes = null) => {
    const updates = { status };
    
    if (status === 'IN_PROGRESS') {
        updates.startedAt = new Date();
    } else if (status === 'COMPLETED') {
        updates.completedAt = new Date();
    }
    
    if (notes) updates.notes = notes;
    
    return prisma.venueMaintenance.update({
        where: { id },
        data: updates,
        include: { venue: { select: { id: true, name: true } } }
    });
};

/**
 * Update maintenance details
 */
const updateMaintenance = async (id, data) => {
    return prisma.venueMaintenance.update({
        where: { id },
        data,
        include: { venue: { select: { id: true, name: true } } }
    });
};

/**
 * Delete maintenance schedule
 */
const deleteMaintenance = async (id) => {
    return prisma.venueMaintenance.delete({
        where: { id }
    });
};

/**
 * Get upcoming maintenance for a venue
 */
const getUpcomingMaintenance = async (venueId) => {
    return prisma.venueMaintenance.findMany({
        where: {
            venueId,
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            scheduledAt: { gte: new Date() }
        },
        orderBy: { scheduledAt: 'asc' }
    });
};

// ==================== VENUE AVAILABILITY ====================

/**
 * Get venue availability calendar
 */
const getVenueAvailability = async (venueId, startDate, endDate) => {
    const venue = await prisma.venue.findUnique({
        where: { id: venueId },
        include: {
            bookings: {
                where: {
                    status: { in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.PENDING_DEPOSIT] },
                    event: {
                        startDateTime: { gte: new Date(startDate), lte: new Date(endDate) }
                    }
                },
                include: {
                    event: { select: { id: true, name: true, startDateTime: true, endDateTime: true } }
                }
            },
            maintenance: {
                where: {
                    status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
                    scheduledAt: { gte: new Date(startDate), lte: new Date(endDate) }
                }
            }
        }
    });
    
    if (!venue) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Venue not found');
    }
    
    // Build availability map
    const bookedDates = venue.bookings.map(b => ({
        date: b.event.startDateTime,
        endDate: b.event.endDateTime,
        type: 'BOOKING',
        eventName: b.event.name,
        eventId: b.event.id
    }));
    
    const maintenanceDates = venue.maintenance.map(m => ({
        date: m.scheduledAt,
        type: 'MAINTENANCE',
        title: m.title,
        maintenanceId: m.id
    }));
    
    return {
        venue: { id: venue.id, name: venue.name, capacity: venue.capacity },
        bookedDates,
        maintenanceDates,
        unavailableDates: [...bookedDates, ...maintenanceDates]
    };
};

/**
 * Block venue for maintenance or other reasons
 */
const blockVenueDate = async (venueId, date, reason, blockedBy) => {
    return prisma.venueMaintenance.create({
        data: {
            venueId,
            title: 'Venue Blocked',
            description: reason,
            type: 'ROUTINE',
            status: 'SCHEDULED',
            scheduledAt: new Date(date),
            scheduledBy: blockedBy,
        }
    });
};

// ==================== UTILIZATION REPORTS ====================

/**
 * Get detailed venue utilization report
 */
const getVenueUtilizationReport = async (options = {}) => {
    const { startDate, endDate, venueId } = options;
    
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    
    const venueWhere = { deletedAt: null };
    if (venueId) venueWhere.id = venueId;
    
    const venues = await prisma.venue.findMany({
        where: venueWhere,
        include: {
            bookings: {
                where: {
                    status: { in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING_PAYMENT] },
                    ...(Object.keys(dateFilter).length && { createdAt: dateFilter })
                },
                include: {
                    event: { 
                        select: { 
                            id: true, 
                            name: true, 
                            startDateTime: true, 
                            endDateTime: true,
                            attendance: true 
                        } 
                    }
                }
            },
            maintenance: {
                where: Object.keys(dateFilter).length ? { scheduledAt: dateFilter } : {}
            }
        }
    });
    
    return venues.map(venue => {
        const totalBookings = venue.bookings.length;
        const totalMaintenanceDays = venue.maintenance.length;
        const totalRevenue = venue.bookings.reduce((sum, b) => sum + Number(b.calculatedCost || 0), 0);
        const totalAttendance = venue.bookings.reduce((sum, b) => sum + (b.event?.attendance?.length || 0), 0);
        
        // Calculate average capacity utilization
        const capacityUtilizations = venue.bookings
            .filter(b => b.event?.attendance?.length)
            .map(b => (b.event.attendance.length / venue.capacity) * 100);
        const avgCapacityUtilization = capacityUtilizations.length > 0
            ? capacityUtilizations.reduce((a, b) => a + b, 0) / capacityUtilizations.length
            : 0;
        
        return {
            venueId: venue.id,
            venueName: venue.name,
            location: venue.location,
            capacity: venue.capacity,
            pricePerBooking: Number(venue.price),
            metrics: {
                totalBookings,
                totalMaintenanceDays,
                totalRevenue,
                totalAttendance,
                averageCapacityUtilization: Math.round(avgCapacityUtilization * 100) / 100,
                revenuePerBooking: totalBookings > 0 ? Math.round((totalRevenue / totalBookings) * 100) / 100 : 0
            }
        };
    });
};

/**
 * Get facility usage summary
 */
const getFacilityUsageSummary = async (options = {}) => {
    const { startDate, endDate } = options;
    
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    
    const [
        totalVenues,
        activeVenues,
        totalBookings,
        pendingBookings,
        totalRevenue,
        upcomingMaintenance
    ] = await prisma.$transaction([
        prisma.venue.count({ where: { deletedAt: null } }),
        prisma.venue.count({
            where: {
                deletedAt: null,
                bookings: { some: { status: BOOKING_STATUS.CONFIRMED } }
            }
        }),
        prisma.booking.count({
            where: {
                status: { in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING_PAYMENT] },
                ...(Object.keys(dateFilter).length && { createdAt: dateFilter })
            }
        }),
        prisma.booking.count({
            where: {
                status: BOOKING_STATUS.PENDING_DEPOSIT,
                ...(Object.keys(dateFilter).length && { createdAt: dateFilter })
            }
        }),
        prisma.booking.aggregate({
            _sum: { calculatedCost: true },
            where: {
                status: { in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING_PAYMENT] },
                ...(Object.keys(dateFilter).length && { createdAt: dateFilter })
            }
        }),
        prisma.venueMaintenance.count({
            where: {
                status: 'SCHEDULED',
                scheduledAt: { gte: new Date() }
            }
        })
    ]);
    
    return {
        totalVenues,
        activeVenues,
        utilizationRate: totalVenues > 0 ? Math.round((activeVenues / totalVenues) * 10000) / 100 : 0,
        totalBookings,
        pendingBookings,
        totalRevenue: Number(totalRevenue._sum.calculatedCost || 0),
        upcomingMaintenance
    };
};

// ==================== EVENT SETUP SUPPORT ====================

/**
 * Get events requiring setup support
 */
const getEventsRequiringSetup = async (days = 7) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return prisma.event.findMany({
        where: {
            deletedAt: null,
            status: { in: ['PUBLISHED', 'ONGOING'] },
            startDateTime: {
                gte: new Date(),
                lte: futureDate
            }
        },
        include: {
            venue: {
                include: {
                    tools: true
                }
            },
            organizer: { select: { id: true, name: true, email: true, cellphone_number: true } },
            booking: true
        },
        orderBy: { startDateTime: 'asc' }
    });
};

/**
 * Get venue tools and equipment
 */
const getVenueToolsAndEquipment = async (venueId) => {
    const venue = await prisma.venue.findUnique({
        where: { id: venueId },
        include: {
            tools: {
                where: { deletedAt: null }
            }
        }
    });
    
    if (!venue) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Venue not found');
    }
    
    return {
        venue: { id: venue.id, name: venue.name },
        tools: venue.tools
    };
};

/**
 * Log event setup checklist item
 */
const logSetupActivity = async (eventId, activity, completedBy) => {
    // This could be expanded to use a SetupChecklist model
    // For now, we'll create a report entry
    return prisma.report.create({
        data: {
            eventId,
            authorId: completedBy,
            content: JSON.stringify({
                type: 'SETUP_ACTIVITY',
                activity,
                completedAt: new Date()
            })
        }
    });
};

// ==================== BOOKING PROCESSING ====================

/**
 * Get pending booking requests
 */
const getPendingBookingRequests = async (queryOptions = {}) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const { venueId } = queryOptions;
    
    const where = {
        status: { in: [BOOKING_STATUS.PENDING_DEPOSIT, BOOKING_STATUS.PENDING_PAYMENT] }
    };
    if (venueId) where.venueId = venueId;
    
    const [bookings, totalItems] = await prisma.$transaction([
        prisma.booking.findMany({
            skip,
            take,
            where,
            orderBy: { createdAt: 'asc' },
            include: {
                venue: { select: { id: true, name: true, location: true } },
                event: { select: { id: true, name: true, startDateTime: true, endDateTime: true } },
                organizer: { select: { id: true, name: true, email: true } }
            }
        }),
        prisma.booking.count({ where })
    ]);
    
    return createPaginatedResponse(bookings, totalItems, page, pageSize);
};

/**
 * Process booking space allocation
 */
const processBookingAllocation = async (bookingId, action, notes = null) => {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { venue: true, event: true }
    });
    
    if (!booking) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found');
    }
    
    if (action === 'APPROVE') {
        return prisma.booking.update({
            where: { id: bookingId },
            data: { 
                status: BOOKING_STATUS.PENDING_PAYMENT,
                // Add notes if provided
            },
            include: {
                venue: { select: { id: true, name: true } },
                event: { select: { id: true, name: true } }
            }
        });
    } else if (action === 'REJECT') {
        return prisma.booking.update({
            where: { id: bookingId },
            data: { status: BOOKING_STATUS.CANCELLED },
            include: {
                venue: { select: { id: true, name: true } },
                event: { select: { id: true, name: true } }
            }
        });
    }
    
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid action');
};

module.exports = {
    // Maintenance Management
    createMaintenance,
    listMaintenanceSchedules,
    updateMaintenanceStatus,
    updateMaintenance,
    deleteMaintenance,
    getUpcomingMaintenance,
    
    // Venue Availability
    getVenueAvailability,
    blockVenueDate,
    
    // Utilization Reports
    getVenueUtilizationReport,
    getFacilityUsageSummary,
    
    // Event Setup Support
    getEventsRequiringSetup,
    getVenueToolsAndEquipment,
    logSetupActivity,
    
    // Booking Processing
    getPendingBookingRequests,
    processBookingAllocation,
};
