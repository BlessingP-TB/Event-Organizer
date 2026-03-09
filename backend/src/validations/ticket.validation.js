const { customJoi, uuidParam } = require('./custom.validation');

const getTicket = uuidParam('id');

const issueTicket = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        userId: customJoi.string().uuid().required(),
        ticketDefinitionId: customJoi.string().uuid().required(),
        registrationId: customJoi.string().uuid().optional(),
    }),
});

const redeemTicket = customJoi.object({
    params: customJoi.object({
        ticketId: customJoi.string().uuid().required(),
    }),
});

module.exports = {
    getTicket,
    issueTicket,
    redeemTicket,
};