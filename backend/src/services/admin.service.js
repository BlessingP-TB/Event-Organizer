const {
    prisma,
    ApiError,
    getPagination,
    createPaginatedResponse,
} = require('../utils/index.util');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/index.constants');

const listUsers = async (queryOptions) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const { query: searchString, role } = queryOptions;

    const where = { deletedAt: null };

    // Only filter if a valid role is provided
    if (role && role.toLowerCase() !== 'all') {
        where.role = role;
    }

    if (searchString) {
        where.OR = [
            { name: { contains: searchString } },
            { email: { contains: searchString } },
        ];
    }

    const [users, totalItems] = await prisma.$transaction([
        prisma.user.findMany({
            skip,
            take,
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                active: true,
                createdAt: true,
                account: { select: { emailVerified: true } },
            },
        }),
        prisma.user.count({ where }),
    ]);

    return createPaginatedResponse(users, totalItems, page, pageSize);
};


const getUserById = async (userId) => {
    const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        include: {
            account: true,
            organizerProfile: true,
            documents: true,
        },
    });

    if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found.');
    }
    return user;
};

const updateUser = async (userId, updateBody) => {
    const { email, name, role, active } = updateBody;
    try {
        return await prisma.user.update({
            where: { id: userId },
            data: { email, name, role, active },
        });
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found.');
        }
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            throw new ApiError(
                HTTP_STATUS.CONFLICT,
                'A user with this email already exists.',
                'EMAIL_CONFLICT'
            );
        }
        throw error;
    }
};

const deleteUser = async (userId, adminId) => {
    if (userId === adminId) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            ERROR_MESSAGES.CANNOT_DELETE_SELF
        );
    }
    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                deletedAt: new Date(),
                active: false,
                email: `deleted_${Date.now()}_${userId}@domain.com`,
            },
        });
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found.');
        }
        throw error;
    }
};

const getDashboardStats = async () => {
  // Get registered users count
  const registeredUsers = await prisma.user.count({
    where: { deletedAt: null }
  });

  // Get active events count - events with startDateTime >= today (upcoming or today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeEvents = await prisma.event.count({
    where: {
      startDateTime: {
        gte: today
      },
      status: { in: ['PUBLISHED', 'ONGOING'] },
      deletedAt: null
    }
  });

  // Calculate current month revenue from approved/published events
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(startOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);

  // Get revenue from venue prices for approved/published events in current month
  const currentMonthEvents = await prisma.event.findMany({
    where: {
      startDateTime: {
        gte: startOfMonth,
        lte: endOfMonth
      },
      status: { in: ['PUBLISHED', 'ONGOING'] },
      deletedAt: null
    },
    include: {
      venue: true
    }
  });

  const currentMonthRevenue = currentMonthEvents.reduce((sum, event) => {
    return sum + Number(event.venue.price || 0);
  }, 0);

  // Get total events count for current month (events in current month)
  const eventBookings = await prisma.event.count({
    where: {
      startDateTime: {
        gte: startOfMonth,
        lte: endOfMonth
      },
      status: { in: ['PUBLISHED', 'ONGOING'] },
      deletedAt: null
    }
  });

  // Calculate previous month revenue for comparison
  const startOfPrevMonth = new Date();
  startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);
  startOfPrevMonth.setDate(1);
  startOfPrevMonth.setHours(0, 0, 0, 0);

  const endOfPrevMonth = new Date(startOfPrevMonth);
  endOfPrevMonth.setMonth(startOfPrevMonth.getMonth() + 1);
  endOfPrevMonth.setDate(0);
  endOfPrevMonth.setHours(23, 59, 59, 999);

  const prevMonthEvents = await prisma.event.findMany({
    where: {
      startDateTime: {
        gte: startOfPrevMonth,
        lte: endOfPrevMonth
      },
      status: { in: ['PUBLISHED', 'ONGOING'] },
      deletedAt: null
    },
    include: {
      venue: true
    }
  });

  const previousMonthRevenue = prevMonthEvents.reduce((sum, event) => {
    return sum + Number(event.venue.price || 0);
  }, 0);
  const revenueChangePercent = previousMonthRevenue > 0
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
    : currentMonthRevenue > 0 ? 100 : 0;

  // Get total number of venues
  const totalVenues = await prisma.venue.count();

  // Get top venues and revenue data
  const topVenues = await getTopBookedVenues();
  const revenueData = await getRevenueData();

  return {
    registeredUsers,
    activeEvents,
    eventBookings,
    totalVenues,
    currentMonthRevenue,
    revenueChangePercent: revenueChangePercent.toFixed(2),
    topVenues,
    revenueData
  };
};

const getTopBookedVenues = async () => {
  const topVenues = await prisma.booking.groupBy({
    by: ['venueId'],
    _count: {
      id: true
    },
    _sum: {
      calculatedCost: true
    },
    where: {
      status: { in: ['PENDING_DEPOSIT', 'PENDING_PAYMENT', 'CONFIRMED'] } // Include all active booking statuses
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 5
  });

   const venueIds = topVenues.map(booking => booking.venueId);
  const venues = await prisma.venue.findMany({
    where: {
      id: { in: venueIds }
    }
  });

  const topVenuesWithDetails = topVenues.map(booking => {
    const venue = venues.find(v => v.id === booking.venueId);
    return {
      name: venue?.name || 'Unknown Venue',
      bookedCount: booking._count.id,
      totalRevenue: Number(booking._sum.calculatedCost || 0),
      capacity: venue?.capacity || 0
    };
  });

  return topVenuesWithDetails;
};


const getRevenueData = async () => {
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 14);
  fifteenDaysAgo.setHours(0, 0, 0, 0);

  // Fetch individual bookings with revenue values
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
      createdAt: { gte: fifteenDaysAgo },
      event: { deletedAt: null },
    },
    select: {
      calculatedCost: true, // or totalPaid if you prefer actual payments
    },
  });

  // Extract just the numeric values into a flat array
  const revenueValues = bookings
    .map(booking => Number(booking.calculatedCost || 0))
    .filter(value => value > 0); // optional: exclude zero or null

  return revenueValues;
};

module.exports = {
    listUsers,
    getUserById,
    updateUser,
    deleteUser,
    getDashboardStats,
    getTopBookedVenues,
    getRevenueData,
};
