const { prisma, ApiError } = require('../utils/index.util');
const { app } = require('../configs/index.config');
const {
    HTTP_STATUS,
    ATTENDANCE_STATUS,
} = require('../constants/index.constants');
const eventService = require('./event.service');

const checkRedemptionWindow = (event) => {
    const { startOffsetHours, endOffsetHours } = app.ticketRedemptionWindow;
    const now = new Date();
    const eventStart = new Date(event.startDateTime);
    const eventEnd = new Date(event.endDateTime);

    const redemptionStart = new Date(
        eventStart.getTime() - startOffsetHours * 60 * 60 * 1000
    );
    const redemptionEnd = new Date(
        eventEnd.getTime() + endOffsetHours * 60 * 60 * 1000
    );

    if (now < redemptionStart || now > redemptionEnd) {
        throw new ApiError(
            HTTP_STATUS.UNPROCESSABLE_ENTITY,
            `Check-in/redemption is only allowed between ${redemptionStart.toISOString()} and ${redemptionEnd.toISOString()}.`,
            'REDEMPTION_WINDOW_INVALID'
        );
    }
};

const checkInUser = async (eventId, userId) => {
    const event = await eventService.getEventById(eventId);

    checkRedemptionWindow(event);

    if (event.ticketRequired) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            'This is a ticketed event. Please use the ticket redemption endpoint.'
        );
    }

    return prisma.attendance.upsert({
        where: { userId_eventId: { userId, eventId } },
        create: {
            userId,
            eventId,
            status: ATTENDANCE_STATUS.CHECKED_IN,
            checkedAt: new Date(),
        },
        update: {
            status: ATTENDANCE_STATUS.CHECKED_IN,
            checkedAt: new Date(),
        },
    });
};

const checkOutUser = async (eventId, userId) => {
    const event = await eventService.getEventById(eventId);
    checkRedemptionWindow(event);

    const attendance = await prisma.attendance.findUnique({
        where: { userId_eventId: { userId, eventId } },
    });

    if (!attendance) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User has not checked in.');
    }

    return prisma.attendance.update({
        where: { id: attendance.id },
        data: {
            status: ATTENDANCE_STATUS.CHECKED_OUT,
            checkedAt: new Date(),
        },
    });
};

module.exports = {
    checkInUser,
    checkOutUser,
    checkRedemptionWindow,
};