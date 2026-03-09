const { v4: uuidv4 } = require('uuid');
const { prisma, ApiError } = require('../utils/index.util');
const { env } = require('../configs/index.config');
const {
    HTTP_STATUS,
    ATTENDANCE_STATUS,
} = require('../constants/index.constants');
const attendanceService = require('./attendance.service');

const issueTicketInternal = async (
    eventId,
    ticketBody,
    tx,
    checkCapacity = true
) => {
    const { userId, registrationId, ticketDefinitionId, purchaseId } =
        ticketBody;

    const ticketDef = await tx.ticketDefinition.findFirst({
        where: {
            id: ticketDefinitionId,
            eventId: eventId,
            deletedAt: null,
        },
    });

    if (!ticketDef) {
        throw new ApiError(
            HTTP_STATUS.NOT_FOUND,
            'Ticket definition not found for this event.'
        );
    }

    if (checkCapacity) {
        const ticketsSold = await tx.ticket.count({
            where: {
                ticketDefinitionId: ticketDef.id,
                deletedAt: null,
            },
        });

        if (ticketsSold >= ticketDef.quantity) {
            throw new ApiError(
                HTTP_STATUS.CONFLICT,
                `This ticket type (${ticketDef.name}) is sold out.`
            );
        }
    }

    const ticketId = uuidv4();
    const qrCode = `${env.clientUrl}/redeem-ticket?ticketId=${ticketId}`;

    return tx.ticket.create({
        data: {
            id: ticketId,
            eventId,
            userId,
            registrationId,
            purchaseId,
            ticketDefinitionId: ticketDef.id,
            type: ticketDef.name,
            price: ticketDef.price,
            qrcodeORurl: [qrCode],
        },
    });
};

const issueTicket = async (eventId, ticketBody, tx) => {
    if (tx) {
        return issueTicketInternal(eventId, ticketBody, tx, true);
    }
    return prisma.$transaction(async (prismaTx) => {
        return issueTicketInternal(eventId, ticketBody, prismaTx, true);
    });
};

const listUserTickets = async (userId) => {
    return prisma.ticket.findMany({
        where: { userId, deletedAt: null },
        include: {
            event: { select: { id: true, name: true, startDateTime: true } },
        },
        orderBy: { issuedAt: 'desc' },
    });
};

const listEventTickets = async (eventId) => {
    return prisma.ticket.findMany({
        where: { eventId, deletedAt: null },
        include: {
            user: { select: { id: true, name: true, email: true } },
            purchase: { select: { id: true, status: true } },
        },
        orderBy: { issuedAt: 'desc' },
    });
};

const getTicketById = async (ticketId) => {
    const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, deletedAt: null },
        include: {
            event: true,
            user: { select: { id: true, name: true, email: true } },
        },
    });
    if (!ticket) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Ticket not found.');
    }
    return ticket;
};

const redeemTicket = async (ticketId) => {
    const ticket = await getTicketById(ticketId);
    if (ticket.redeemed) {
        throw new ApiError(
            HTTP_STATUS.CONFLICT,
            'This ticket has already been redeemed.',
            'TICKET_ALREADY_REDEEMED'
        );
    }

    attendanceService.checkRedemptionWindow(ticket.event);

    const redeemedAt = new Date();

    if (!ticket.userId) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            'This ticket is not associated with a user and cannot be redeemed.'
        );
    }

    const [updatedTicket] = await prisma.$transaction([
        prisma.ticket.update({
            where: { id: ticketId },
            data: {
                redeemed: true,
                redeemedAt: redeemedAt,
            },
        }),
        prisma.attendance.upsert({
            where: {
                userId_eventId: {
                    userId: ticket.userId,
                    eventId: ticket.eventId,
                },
            },
            update: {
                status: ATTENDANCE_STATUS.ATTENDED,
                checkedAt: redeemedAt,
            },
            create: {
                userId: ticket.userId,
                eventId: ticket.eventId,
                status: ATTENDANCE_STATUS.ATTENDED,
                checkedAt: redeemedAt,
            },
        }),
    ]);

    return updatedTicket;
};

module.exports = {
    issueTicket,
    listUserTickets,
    listEventTickets,
    getTicketById,
    redeemTicket,
    issueTicketInternal
};