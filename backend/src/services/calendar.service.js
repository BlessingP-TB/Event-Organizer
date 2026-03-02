const { prisma, ApiError } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const createCalendar = async (data) => {
    try {
        // Use upsert to handle duplicates automatically
        return await prisma.calendar.upsert({
            where: {
                // Matches the @@unique([date, startTime, endTime]) in your schema
                date_startTime_endTime: {
                    date: new Date(data.date),
                    startTime: data.startTime,
                    endTime: data.endTime
                }
            },
            // If it exists, just update the venues
            update: {
                venueIds: data.venueIds,
            },
            // If it doesn't exist, create it
            create: {
                date: new Date(data.date),
                startTime: data.startTime,
                endTime: data.endTime,
                venueIds: data.venueIds,
                createdById: data.createdById,
            },
        });
    } catch (error) {
        console.error("Calendar operation failed:", error);
        throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to save calendar date.");
    }
};

const getCalendars = async () => {
    return await prisma.calendar.findMany({
        orderBy: { date: 'asc' },
    });
};

const updateCalendar = async (id, data) => {
    return await prisma.calendar.update({
        where: { id },
        data: {
            date: new Date(data.date),
            startTime: data.startTime,
            endTime: data.endTime,
            venueIds: data.venueIds,
        },
    });
};

const deleteCalendar = async (id) => {
    return await prisma.calendar.delete({
        where: { id },
    });
};

module.exports = {
    createCalendar,
    getCalendars,
    updateCalendar,
    deleteCalendar,
};