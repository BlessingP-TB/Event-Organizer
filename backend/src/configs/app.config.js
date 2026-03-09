const { storage } = require('./environment.config');

module.exports = {
    pagination: {
        defaultPage: 1,
        defaultPageSize: 10,
        maxPageSize: 100,
    },
    uploads: {
        enabled: storage.uploadsEnabled,
        maxFileSize: storage.maxFileSize,
        allowedMimeTypes: storage.allowedMimeTypes,
        storageStrategy: storage.strategy,
    },
    coolingBreakHours: 1,
    publishPaymentWindowDays: 7,
    ticketRedemptionWindow: {
        startOffsetHours: 1,
        endOffsetHours: 2,
    },
    idempotencyKeyTtlHours: 24,
};

