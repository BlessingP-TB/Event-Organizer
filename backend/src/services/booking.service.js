const {
    prisma,
    ApiError,
    getPagination,
    createPaginatedResponse,
} = require('../utils/index.util');
const {
    HTTP_STATUS,
    BOOKING_STATUS,
    INVOICE_STATUS,
    RATE_TYPE,
    ROLES,
} = require('../constants/index.constants');
const systemSettingService = require('./systemSetting.service');
const invoiceService = require('./invoice.service');
const paymentService = require('./payment.service');

const calculateVenueCost = (venue, startDateTime, endDateTime) => {
    const msPerHour = 1000 * 60 * 60;
    const msPerDay = msPerHour * 24;

    const durationMs = endDateTime.getTime() - startDateTime.getTime();

    if (venue.rateType === RATE_TYPE.PER_HOUR) {
        const durationHours = Math.ceil(durationMs / msPerHour);
        return durationHours * venue.price;
    }

    if (venue.rateType === RATE_TYPE.PER_DAY) {
        const durationDays = Math.ceil(durationMs / msPerDay);
        return durationDays * venue.price;
    }

    return venue.price;
};

const createEventBooking = async (
    eventId,
    organizerId,
    venue,
    startDateTime,
    endDateTime,
    tx
) => {
    const calculatedCost = calculateVenueCost(venue, startDateTime, endDateTime);

    const defaultIssuer = await tx.venueIssuer.findFirst();
    if (!defaultIssuer) {
        throw new ApiError(
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            'No Venue Issuer configured in system. Cannot create invoice.'
        );
    }

    const depositThresholdSetting = await systemSettingService.getSetting(
        'DEPOSIT_THRESHOLD'
    );
    const depositThreshold = depositThresholdSetting
        ? parseFloat(depositThresholdSetting.value)
        : 0;

    let depositRequired = venue.depositValue || 0;
    let bookingStatus = BOOKING_STATUS.PENDING_PAYMENT;

    if (calculatedCost > depositThreshold && depositRequired === 0) {
        const defaultDepositSetting = await systemSettingService.getSetting(
            'DEFAULT_DEPOSIT_PERCENTAGE'
        );
        const defaultDepositPercentage = defaultDepositSetting
            ? parseFloat(defaultDepositSetting.value)
            : 0.2;
        depositRequired = calculatedCost * defaultDepositPercentage;
    }

    if (depositRequired > 0) {
        bookingStatus = BOOKING_STATUS.PENDING_DEPOSIT;
    }

    const booking = await tx.booking.create({
        data: {
            eventId,
            organizerId,
            venueId: venue.id,
            calculatedCost,
            depositRequired: depositRequired > 0 ? depositRequired : null,
            status: bookingStatus,
        },
    });

    await tx.invoice.create({
        data: {
            bookingId: booking.id,
            invoiceNo: `INV-BK-${booking.id.substring(0, 8).toUpperCase()}`,
            amount: depositRequired > 0 ? depositRequired : calculatedCost,
            currency: 'ZAR',
            status: INVOICE_STATUS.PENDING,
            venueIssuerId: defaultIssuer.id,
        },
    });

    await invoiceService.createOrUpdateInvoiceDocument(null, booking.id, tx);

    return booking;
};

const getBookingById = async (bookingId, user) => {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            invoice: true,
            event: { select: { name: true, startDateTime: true } },
            venue: { select: { name: true, location: true } },
        },
    });
    if (!booking) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found.');
    }
    if (user.role !== ROLES.ADMIN && booking.organizerId !== user.id) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Forbidden.');
    }
    return booking;
};

const listUserBookings = async (userId, queryOptions) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const whereClause = { organizerId: userId };
    const [bookings, totalItems] = await prisma.$transaction([
        prisma.booking.findMany({
            where: whereClause,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                event: { select: { name: true, startDateTime: true } },
                invoice: true,
            },
        }),
        prisma.booking.count({ where: whereClause }),
    ]);
    return createPaginatedResponse(bookings, totalItems, page, pageSize);
};


const updateBookingDetails = async (bookingId, updateData) => {
    const { status, depositPaid, totalPaid } = updateData;
    const updatePayload = {};

    // Only add provided fields
    if (status !== undefined) updatePayload.status = status;
    if (depositPaid !== undefined) updatePayload.depositPaid = depositPaid;
    if (totalPaid !== undefined) updatePayload.totalPaid = totalPaid;

    try {
        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: updatePayload,                 // ✅ MUST BE inside `data:`
            include: { invoice: true }
        });

        // Optional: Update invoice when booking is cancelled
        if (
            updatedBooking.invoice &&
            updatePayload.status === BOOKING_STATUS.CANCELLED
        ) {
            await prisma.invoice.update({
                where: { id: updatedBooking.invoice.id },
                data: { status: INVOICE_STATUS.CANCELLED }   // ✅ MUST BE inside `data:`
            });
        }

        return updatedBooking;

    } catch (error) {
        if (error.code === 'P2025') {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found.');
        }
        throw error;
    }
};



const listAllBookings = async (queryOptions) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const whereClause = {};
    const [bookings, totalItems] = await prisma.$transaction([
        prisma.booking.findMany({
            where: whereClause,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                organizer: { select: { name: true, email: true } },
                invoice: true,
            },
        }),
        prisma.booking.count({ where: whereClause }),
    ]);
    return createPaginatedResponse(bookings, totalItems, page, pageSize);
};

const payBookingInvoice = async (bookingId, paymentReference, user) => {
    const booking = await getBookingById(bookingId, user);
    if (!booking.invoice) {
        throw new ApiError(
            HTTP_STATUS.NOT_FOUND,
            'Invoice not found for this booking.'
        );
    }
    if (booking.invoice.status === INVOICE_STATUS.PAID) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Invoice is already paid.');
    }

    return paymentService.processB2BPayment(
        booking,
        booking.invoice,
        paymentReference
    );
};



const cancelBooking = async (bookingId, user) => {
    const booking = await getBookingById(bookingId, user);
    if (booking.status === BOOKING_STATUS.CANCELLED) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Booking is already cancelled.');
    }

    return prisma.booking.update({
        where: { id: bookingId },
        data: {
            status: BOOKING_STATUS.CANCELLED,
            invoice: {
                update: {
                    status: INVOICE_STATUS.CANCELLED,
                },
            },
        },
    });
};

module.exports = {
    createEventBooking,
    getBookingById,
    listUserBookings,
    listAllBookings,
    payBookingInvoice,
    cancelBooking,
    updateBookingDetails
};