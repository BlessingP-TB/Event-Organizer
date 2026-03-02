const { purchaseService, invoiceService } = require('../services/index.service');
const { catchAsync, ApiError } = require('../utils/index.util');
const { HTTP_STATUS , ERROR_MESSAGES} = require('../constants/index.constants');

const createPurchase = catchAsync(async (req, res) => {
    const purchase = await purchaseService.createPurchase(
        req.user.id,
        req.params.eventId,
        req.body
    );
    res.status(HTTP_STATUS.CREATED).send(purchase);
});

const listMyPurchases = catchAsync(async (req, res) => {
    const paginatedResult = await purchaseService.listUserPurchases(
        req.user.id,
        req.query
    );
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const getPurchase = catchAsync(async (req, res) => {
    const purchase = await purchaseService.getPurchaseById(req.params.id);
    res.status(HTTP_STATUS.OK).send(purchase);
});

const fulfillPurchase = catchAsync(async (req, res) => {
    const { reference } = req.body;
    const { id: purchaseId } = req.params;

    const result = await purchaseService.fulfillPurchase(
        purchaseId,
        req.user.id,
        reference
    );
    res.status(HTTP_STATUS.OK).send(result);
});

const getPurchaseInvoice = catchAsync(async (req, res) => {
    const purchase = await purchaseService.getPurchaseById(req.params.id);
    if (!purchase.invoice) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.PURCHASE_INVOICE_NOT_FOUND);
    }
    const invoice = await invoiceService.getInvoiceById(purchase.invoice.id, req.user);
    res.status(HTTP_STATUS.OK).send(invoice);
});


module.exports = {
    createPurchase,
    listMyPurchases,
    getPurchase,
    fulfillPurchase,
    getPurchaseInvoice,
};