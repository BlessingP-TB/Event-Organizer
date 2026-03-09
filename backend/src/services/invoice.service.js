const { prisma, ApiError, pdfUtil, getPagination, createPaginatedResponse, logger } = require('../utils/index.util');
const { HTTP_STATUS, DOC_TYPE, DOC_STATUS, ROLES } = require('../constants/index.constants');
const { storage } = require('../configs/environment.config');
const axios = require('axios');
const blobUtil = require('../utils/blob.util');

const storePdf = async (buffer, filename) => {
    if (storage.strategy === 'BLOB') {
        try {
            const { url } = await blobUtil.uploadBuffer(buffer, filename, 'application/pdf');
            return { url, content: null };
        } catch (error) {
            logger.error('Failed to upload PDF invoice to blob storage', error);
            throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to store PDF invoice.');
        }
    } else if (storage.strategy === 'DB') {
        return { url: null, content: buffer };
    } else {
        throw new ApiError(HTTP_STATUS.NOT_IMPLEMENTED, 'Invalid or unsupported storage strategy.');
    }
};

const getLogoBuffer = async (issuer) => {
    if (issuer.institutionLogoUrl) {
        try {
            const response = await axios.get(issuer.institutionLogoUrl, { responseType: 'arraybuffer' });
            return response.data;
        } catch (error) {
            logger.error('Failed to download logo buffer for PDF', { url: issuer.institutionLogoUrl, error: error.message });
            return null;
        }
    }
    if (issuer.institutionLogo) {
        return issuer.institutionLogo;
    }
    return null;
};

const createOrUpdateInvoiceDocument = async (purchaseId, bookingId, tx) => {
    const prismaClient = tx || prisma;
    let invoice;
    let contentBuffer;
    let filename;
    let userId;
    let docIdentifier;
    let docData;
    let issuer;
    let eventName;
    let logoBuffer;
    if (purchaseId) {
        const purchase = await prismaClient.purchase.findUnique({
            where: { id: purchaseId },
            include: {
                invoice: { include: { venueIssuer: true } },
                user: { select: { id: true, name: true, email: true } },
                event: { select: { name: true, ticketDefinitions: { where: { deletedAt: null } } } }
            }
        });
        const ticketDef = purchase?.event?.ticketDefinitions.find((td) => td.id === purchase.ticketDefinitionId);
        if (!purchase || !purchase.invoice || !purchase.user || !purchase.event || !ticketDef || !purchase.invoice.venueIssuer) {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Incomplete purchase data, missing ticket definition, or missing venue issuer for invoice doc.');
        }
        invoice = purchase.invoice;
        issuer = purchase.invoice.venueIssuer;
        userId = purchase.userId;
        eventName = purchase.event.name;
        logoBuffer = await getLogoBuffer(issuer);
        contentBuffer = await pdfUtil.generateB2CInvoicePDF(invoice, purchase, purchase.user, issuer, ticketDef, logoBuffer);
        filename = `Invoice-Ticket-${invoice.invoiceNo}.pdf`;
        docIdentifier = { purchaseId: purchaseId, type: DOC_TYPE.INVOICE };
        docData = { userId, purchaseId, bookingId: null };
    } else if (bookingId) {
        const booking = await prismaClient.booking.findUnique({
            where: { id: bookingId },
            include: {
                invoice: { include: { venueIssuer: true } },
                organizer: { select: { id: true, name: true, email: true } },
                event: { select: { name: true } },
                venue: { select: { name: true } }
            }
        });
        if (!booking || !booking.invoice || !booking.organizer || !booking.event || !booking.venue || !booking.invoice.venueIssuer) {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Incomplete booking data or missing venue issuer for invoice doc.');
        }
        invoice = booking.invoice;
        issuer = booking.invoice.venueIssuer;
        userId = booking.organizerId;
        eventName = booking.event.name;
        logoBuffer = await getLogoBuffer(issuer);
        contentBuffer = await pdfUtil.generateB2BInvoicePDF(invoice, booking, booking.organizer, issuer, logoBuffer);
        filename = `Invoice-Venue-${invoice.invoiceNo}.pdf`;
        docIdentifier = { bookingId: bookingId, type: DOC_TYPE.INVOICE };
        docData = { userId, purchaseId: null, bookingId };
    } else {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Must provide purchaseId or bookingId.');
    }
    const { url: fileUrl, content: fileContent } = await storePdf(contentBuffer, filename);
    const existingDoc = await prismaClient.document.findFirst({ where: docIdentifier });
    const data = {
        ...docData,
        type: DOC_TYPE.INVOICE,
        filename: filename,
        mimetype: 'application/pdf',
        url: fileUrl,
        content: fileContent,
        size: contentBuffer.byteLength,
        status: DOC_STATUS.APPROVED,
        reviewedAt: new Date(),
        eventName: eventName
    };
    if (existingDoc) {
        return prismaClient.document.update({
            where: { id: existingDoc.id },
            data: { ...data, submittedAt: existingDoc.submittedAt }
        });
    } else {
        return prismaClient.document.create({
            data: { ...data, submittedAt: new Date() }
        });
    }
};

const getInvoiceById = async (invoiceId, user) => {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            purchase: { select: { userId: true } },
            booking: { select: { organizerId: true } }
        }
    });
    if (!invoice) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Invoice not found.');
    }
    const isOwner = (invoice.purchase && invoice.purchase.userId === user.id) || (invoice.booking && invoice.booking.organizerId === user.id);
    if (user.role !== ROLES.ADMIN && !isOwner) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Forbidden.');
    }
    return invoice;
};

const listUserInvoices = async (userId, queryOptions) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const whereClause = {
        OR: [{ purchase: { userId: userId } }, { booking: { organizerId: userId } }]
    };
    const [invoices, totalItems] = await prisma.$transaction([
        prisma.invoice.findMany({ where: whereClause, skip, take, orderBy: { issuedAt: 'desc' } }),
        prisma.invoice.count({ where: whereClause })
    ]);
    return createPaginatedResponse(invoices, totalItems, page, pageSize);
};

const listAllInvoices = async (queryOptions) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const whereClause = {};
    const [invoices, totalItems] = await prisma.$transaction([
        prisma.invoice.findMany({
            where: whereClause,
            skip,
            take,
            orderBy: { issuedAt: 'desc' },
            include: {
                purchase: { select: { user: { select: { name: true } } } },
                booking: { select: { organizer: { select: { name: true } } } }
            }
        }),
        prisma.invoice.count({ where: whereClause })
    ]);
    return createPaginatedResponse(invoices, totalItems, page, pageSize);
};

module.exports = {
    createOrUpdateInvoiceDocument,
    getInvoiceById,
    listUserInvoices,
    listAllInvoices
};