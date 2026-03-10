const { customJoi } = require('./custom.validation');

const createSupportRequest = customJoi.object({
    body: customJoi.object({
        category: customJoi.string().valid('GENERAL', 'ORGANIZER_CONTACT', 'TECHNICAL_ISSUE', 'TICKET_PAYMENT').default('GENERAL'),
        subject: customJoi.string().trim().min(5).max(120).required(),
        message: customJoi.string().trim().min(20).max(2000).required(),
    }),
});

module.exports = {
    createSupportRequest,
};
