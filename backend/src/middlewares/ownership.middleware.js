const { prisma, ApiError, asyncHandler } = require('../utils/index.util');
const { HTTP_STATUS, ERROR_MESSAGES, ROLES } = require('../constants/index.constants');

const checkEventOwner = asyncHandler(async (req, res, next) => {
    const { eventId } = req.params;
    const { id: userId, role } = req.user;

    if (role === ROLES.ADMIN) {
        return next();
    }

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { organizerId: true },
    });

    if (!event) {
        return next(new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.EVENT_NOT_FOUND));
    }

    if (event.organizerId !== userId) {
        return next(new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN));
    }

    next();
});

const checkPurchaseOwner = asyncHandler(async (req, res, next) => {
    const { id: purchaseId } = req.params;
    const { id: userId, role } = req.user;

    if (role === ROLES.ADMIN) {
        return next();
    }

    const purchase = await prisma.purchase.findUnique({
        where: { id: purchaseId },
        select: { userId: true },
    });

    if (!purchase) {
        return next(new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.PURCHASE_NOT_FOUND));
    }

    if (purchase.userId !== userId) {
        return next(new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN));
    }

    next();
});

const checkTicketOwner = asyncHandler(async (req, res, next) => {
    const { id: ticketId } = req.params;
    const { id: userId, role } = req.user;

    if (role === ROLES.ADMIN) {
        return next();
    }

    const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { userId: true },
    });

    if (!ticket) {
        return next(new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TICKET_NOT_FOUND));
    }

    if (ticket.userId !== userId) {
        return next(new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN));
    }

    next();
});

module.exports = {
    checkEventOwner,
    checkPurchaseOwner,
    checkTicketOwner,
};
