const { customJoi, uuidParam, paginationQuery } = require('./custom.validation');
const { PAYMENT_METHOD } = require('../constants/index.constants');

const purchaseIdParam = uuidParam('id');
const listPurchases = paginationQuery;

const createPurchase = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        ticketDefinitionId: customJoi.string().uuid().required(),
        paymentMethod: customJoi
            .string()
            .valid(...Object.values(PAYMENT_METHOD))
            .required(),
    }),
});

module.exports = {
    purchaseIdParam,
    listPurchases,
    createPurchase,
};