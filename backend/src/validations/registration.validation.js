const { customJoi, paginationQuery } = require('./custom.validation');

const listMyRegistrations = paginationQuery;

const createRegistration = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({}),
});

module.exports = {
    listMyRegistrations,
    createRegistration,
};