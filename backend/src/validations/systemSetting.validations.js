const { customJoi } = require('./custom.validation');

const getSetting = customJoi.object({
    params: customJoi.object({
        key: customJoi.string().required(),
    }),
});

const upsertSetting = customJoi.object({
    body: customJoi.object({
        key: customJoi.string().required(),
        value: customJoi.string().required(),
        description: customJoi.string().allow('').optional(),
    }),
});

const deleteSetting = customJoi.object({
    params: customJoi.object({
        key: customJoi.string().required(),
    }),
});

module.exports = {
    getSetting,
    upsertSetting,
    deleteSetting,
};