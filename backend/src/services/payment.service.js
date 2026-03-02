const axios = require('axios');
const { prisma, ApiError, logger } = require('../utils/index.util');
const { HTTP_STATUS, PURCHASE_STATUS, INVOICE_STATUS, BOOKING_STATUS } = require('../constants/index.constants');
const { payment: paymentConfig } = require('../configs/environment.config');
const ticketService = require('./ticket.service');
const invoiceService = require('./invoice.service');

const paystack = axios.create({
    baseURL: 'https://api.paystack.co',
    headers: {
        Authorization: `Bearer ${paymentConfig.paystackSecretKey}`,
        'Content-Type': 'application/json'
    }
});

if (!paymentConfig.paystackSecretKey) {
    logger.warn('Paystack secret key not found. Payment service will not function.');
}

const verifyPaystackTransaction = async (reference, expectedAmount) => {
    try {
        const response = await paystack.get(`/transaction/verify/${reference}`);
        const { data } = response.data;
        if (data.status !== 'success') {
            throw new Error(data.gateway_response || 'Payment verification failed');
        }
        const chargeAmount = data.amount / 100;
        if (chargeAmount < expectedAmount) {
            throw new Error(`Payment amount mismatch. Expected at least ${expectedAmount} but received ${chargeAmount}`);
        }
        return data;
    } catch (error) {
        logger.error('Paystack verification error', { error: error.response?.data || error.message, reference });
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, error.response?.data?.message || 'Payment verification failed', 'PAYMENT_GATEWAY_ERROR');
    }
};

const processB2CPayment = async (purchase, paymentReference) => {
    if (!paymentConfig.paystackSecretKey) {
        throw new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, 'Payment processing is not configured.', 'PAYMENT_SERVICE_UNAVAILABLE');
    }
    try {
        const transactionData = await verifyPaystackTransaction(paymentReference, purchase.amount);
        const [updatedPurchase, invoice, ticket] = await prisma.$transaction(async (tx) => {
            const p = await tx.purchase.update({
                where: { id: purchase.id },
                data: { status: PURCHASE_STATUS.COMPLETED, providerTransaction: transactionData.id.toString() }
            });
            const i = await tx.invoice.update({
                where: { purchaseId: p.id },
                data: { status: INVOICE_STATUS.PAID, issuedAt: new Date() }
            });
            const ticketDef = await tx.ticketDefinition.findUnique({ where: { id: p.ticketDefinitionId } });
            if (!ticketDef) {
                throw new Error('TicketDefinition not found during transaction.');
            }
            const t = await ticketService.issueTicket(p.eventId, { userId: p.userId, type: ticketDef.name, price: ticketDef.price, purchaseId: p.id, ticketDefinitionId: ticketDef.id }, tx);
            await invoiceService.createOrUpdateInvoiceDocument(p.id, null, tx);
            return [p, i, t];
        });
        return { purchase: updatedPurchase, invoice, ticket };
    } catch (error) {
        logger.error('Payment processing failed', { error: error.message, purchaseId: purchase.id });
        await prisma.purchase.update({ where: { id: purchase.id }, data: { status: PURCHASE_STATUS.FAILED } });
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Payment failed: ${error.message}`, 'PAYMENT_GATEWAY_ERROR');
    }
};

const processB2BPayment = async (booking, invoice, paymentReference) => {
    if (!paymentConfig.paystackSecretKey) {
        throw new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, 'Payment processing is not configured.');
    }
    try {
        const transactionData = await verifyPaystackTransaction(paymentReference, invoice.amount);
        const [updatedBooking, updatedInvoice] = await prisma.$transaction(async (tx) => {
            const paidAmount = transactionData.amount / 100;
            const i = await tx.invoice.update({ where: { id: invoice.id }, data: { status: INVOICE_STATUS.PAID, issuedAt: new Date() } });
            const newTotalPaid = parseFloat(booking.totalPaid) + parseFloat(paidAmount);
            let newBookingStatus = booking.status;
            let newDepositPaid = booking.depositPaid;
            if (booking.status === BOOKING_STATUS.PENDING_DEPOSIT) {
                newDepositPaid = true;
                newBookingStatus = BOOKING_STATUS.PENDING_PAYMENT;
            }
            if (newTotalPaid >= booking.calculatedCost) {
                newBookingStatus = BOOKING_STATUS.CONFIRMED;
            }
            const b = await tx.booking.update({
                where: { id: booking.id },
                data: { status: newBookingStatus, depositPaid: newDepositPaid, totalPaid: newTotalPaid }
            });
            await invoiceService.createOrUpdateInvoiceDocument(null, b.id, tx);
            return [b, i];
        });
        return { booking: updatedBooking, invoice: updatedInvoice };
    } catch (error) {
        logger.error('B2B Payment processing failed', { error: error.message, bookingId: booking.id });
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Payment failed: ${error.message}`, 'PAYMENT_GATEWAY_ERROR');
    }
};

module.exports = {
    processB2BPayment,
    processB2CPayment
}