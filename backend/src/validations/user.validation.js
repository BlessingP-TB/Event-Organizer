const { customJoi, uuidParam } = require('./custom.validation');

const updateUserProfile = customJoi.object({
    body: customJoi.object({
        name: customJoi.string().min(1).optional(),
        cellphone_number: customJoi.string().allow('').optional(),
    }),
});

const requestOrganizerUpgrade = customJoi.object({
    body: customJoi.object({
        companyName: customJoi.string().required(),
        website: customJoi.string().uri().allow('').optional(),
        notes: customJoi.string().allow('').optional(),
        cellphone_number: customJoi.string().required(),
    }),
});

const deleteSession = uuidParam('id');

module.exports = {
    updateUserProfile,
    requestOrganizerUpgrade,
    deleteSession,
};