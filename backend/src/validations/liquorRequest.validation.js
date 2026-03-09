const { customJoi, uuidParam } = require('./custom.validation');

const eventIdParam = uuidParam('eventId');
const liquorRequestIdParam = uuidParam('id');

const createLiquorRequest = eventIdParam.keys({
    body: customJoi.object({
        startTime: customJoi.date().iso().required(),
        endTime: customJoi
            .date()
            .iso()
            .greater(customJoi.ref('startTime'))
            .required(),
        policyAgreed: customJoi.boolean().valid(true).required(),
    }),
});

const updateLiquorRequest = liquorRequestIdParam.keys({
    body: customJoi.object({
        startTime: customJoi.date().iso().optional(),
        endTime: customJoi.date().iso().optional(),
        policyAgreed: customJoi.boolean().valid(true).optional(),
    }),
});

module.exports = {
    eventIdParam,
    liquorRequestIdParam,
    createLiquorRequest,
    updateLiquorRequest,
};

