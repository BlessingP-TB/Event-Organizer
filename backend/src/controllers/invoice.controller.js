const { invoiceService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const getInvoice = catchAsync(async (req, res) => {
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user);
    res.status(HTTP_STATUS.OK).send(invoice);
});

const listMyInvoices = catchAsync(async (req, res) => {
    const paginatedResult = await invoiceService.listUserInvoices(
        req.user.id,
        req.query
    );
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const listAllInvoices = catchAsync(async (req, res) => {
    const paginatedResult = await invoiceService.listAllInvoices(req.query);
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

module.exports = {
    getInvoice,
    listMyInvoices,
    listAllInvoices,
};