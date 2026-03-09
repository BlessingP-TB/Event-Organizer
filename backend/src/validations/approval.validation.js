const { customJoi, uuidParam } = require('./custom.validation');
const { APPROVAL_TYPE, APPROVAL_STATUS } = require('../constants/index.constants');

const approvalIdParam = uuidParam('id');

const createEventApproval = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        type: customJoi
            .string()
            .valid(...Object.values(APPROVAL_TYPE))
            .required(),
        status: customJoi
            .string()
            .valid(...Object.values(APPROVAL_STATUS))
            .required(),
        notes: customJoi.string().allow('').optional(),
    }),
});

const updateApproval = customJoi.object({
    params: customJoi.object({
        id: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        status: customJoi
            .string()
            .valid(...Object.values(APPROVAL_STATUS))
            .required(),
        notes: customJoi.string().allow('').optional(),
    }),
});

const verifyOrganizer = customJoi.object({
    params: customJoi.object({
        profileId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        verified: customJoi.boolean().required(),
        promoteUser: customJoi.boolean().default(false),
    }),
});

module.exports = {
    approvalIdParam,
    createEventApproval,
    updateApproval,
    verifyOrganizer,
};
