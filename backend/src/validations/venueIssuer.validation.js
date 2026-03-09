const { customJoi, uuidParam, paginationQuery } = require('./custom.validation');

const listIssuers = paginationQuery;

const getIssuer = uuidParam('id');

const deleteIssuer = uuidParam('id');

const createIssuer = customJoi.object({
    body: customJoi.object({
        institutionName: customJoi.string().required(),
        institutionAddress: customJoi
            .array()
            .items(customJoi.string())
            .min(1)
            .required(),
        otherDetails: customJoi
            .array()
            .items(customJoi.string())
            .optional(),
        institutionLogo: customJoi.string().base64().optional(),
    }),
});

const updateIssuer = uuidParam('id').keys({
    body: customJoi.object({
        institutionName: customJoi.string().optional(),
        institutionAddress: customJoi
            .array()
            .items(customJoi.string())
            .min(1)
            .optional(),
        otherDetails: customJoi
            .array()
            .items(customJoi.string())
            .optional(),
        institutionLogo: customJoi.string().base64().optional(),
    }),
});

module.exports = {
    listIssuers,
    getIssuer,
    deleteIssuer,
    createIssuer,
    updateIssuer,
};