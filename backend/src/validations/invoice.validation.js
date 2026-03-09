const {
    customJoi,
    uuidParam,
    basePaginationQuery,
} = require('./custom.validation');

const invoiceIdParam = uuidParam('id');
const listInvoices = customJoi.object({
    query: basePaginationQuery,
});

module.exports = {
    invoiceIdParam,
    listInvoices,
};