const {
    prisma,
    ApiError,
    getPagination,
    createPaginatedResponse,
} = require('../utils/index.util');
const {
    HTTP_STATUS,
    EVENT_STATUS,
    PURCHASE_STATUS,
    INVOICE_STATUS,
} = require('../constants/index.constants');
const eventService = require('./event.service');
const paymentService = require('./payment.service');
const invoiceService = require('./invoice.service');

const createPurchase = async (userId, eventId, purchaseBody) => {
    const { ticketDefinitionId, paymentMethod } = purchaseBody;

    return prisma.$transaction(async (tx) => {
        const event = await eventService.getEventById(eventId);
        if (event.status !== EVENT_STATUS.PUBLISHED) {
            throw new ApiError(
                HTTP_STATUS.BAD_REQUEST,
                'Purchases are only allowed for published events.'
            );
        }
        if (event.isFree) {
            throw new ApiError(
                HTTP_STATUS.BAD_REQUEST,
                'This is a free event; no purchase is necessary.'
            );
        }
        if (!event.allowAttendeePurchase) {
            throw new ApiError(
                HTTP_STATUS.FORBIDDEN,
                'This event does not allow attendee purchases.'
            );
        }

        const ticketDef = await tx.ticketDefinition.findUnique({
            where: { id: ticketDefinitionId },
        });

        if (!ticketDef || ticketDef.eventId !== eventId) {
            throw new ApiError(
                HTTP_STATUS.NOT_FOUND,
                'Ticket type not found for this event.'
            );
        }

        const ticketsSold = await tx.ticket.count({
            where: { ticketDefinitionId },
        });

        if (ticketsSold >= ticketDef.quantity) {
            throw new ApiError(
                HTTP_STATUS.CONFLICT,
                'This ticket type is sold out.'
            );
        }

        const defaultIssuer = await tx.venueIssuer.findFirst();
        if (!defaultIssuer) {
            throw new ApiError(
                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                'No Venue Issuer configured in system. Cannot create invoice.'
            );
        }

        const purchase = await tx.purchase.create({
            data: {
                userId,
                eventId,
                amount: ticketDef.price,
                paymentMethod,
                status: PURCHASE_STATUS.INITIATED,
                ticketDefinitionId: ticketDefinitionId,
            },
        });

        await tx.invoice.create({
            data: {
                purchaseId: purchase.id,
                invoiceNo: `INV-${purchase.id.substring(0, 8).toUpperCase()}`,
                amount: purchase.amount,
                currency: purchase.currency,
                status: INVOICE_STATUS.PENDING,
                venueIssuerId: defaultIssuer.id,
            },
        });

        await invoiceService.createOrUpdateInvoiceDocument(purchase.id, null, tx);

        return purchase;
    });
};

const listUserPurchases = async (userId, queryOptions) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const whereClause = { userId, deletedAt: null };

    const query = {
        where: whereClause,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
            event: { select: { id: true, name: true, startDateTime: true } },
            invoice: true,
        },
    };

    const [purchases, totalItems] = await prisma.$transaction([
        prisma.purchase.findMany(query),
        prisma.purchase.count({ where: query.where }),
    ]);

    return createPaginatedResponse(purchases, totalItems, page, pageSize);
};

const getPurchaseById = async (purchaseId) => {
    const purchase = await prisma.purchase.findFirst({
        where: { id: purchaseId, deletedAt: null },
        include: {
            event: { select: { name: true } },
            user: { select: { name: true, email: true } },
            tickets: true,
            invoice: true,
        },
    });

    if (!purchase) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Purchase not found.');
    }
    return purchase;
};

const fulfillPurchase = async (purchaseId, userId, reference) => {
    const purchase = await getPurchaseById(purchaseId);

    if (purchase.status === PURCHASE_STATUS.COMPLETED) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Purchase already completed.');
    }
    if (purchase.userId !== userId) {
        throw new ApiError(
            HTTP_STATUS.FORBIDDEN,
            'You are not authorized to fulfill this purchase.'
        );
    }
    if (!purchase.ticketDefinitionId) {
        throw new ApiError(
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            'Purchase is missing ticket definition. Cannot fulfill.'
        );
    }

    return paymentService.processB2CPayment(purchase, reference);
};

module.exports = {
    createPurchase,
    listUserPurchases,
    getPurchaseById,
    fulfillPurchase,
};