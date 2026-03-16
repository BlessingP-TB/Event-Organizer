const { customJoi, uuidParam } = require('./custom.validation');
const { ROLES } = require('../constants/index.constants');

const notificationIdParam = uuidParam('id');

const listNotifications = customJoi.object({
    query: customJoi.object({
        userId: customJoi.string().uuid().optional(),
    }),
});

const createNotification = customJoi.object({
    body: customJoi.object({
        title: customJoi.string().trim().max(255).required(),
        message: customJoi.string().trim().required(),
        userId: customJoi.string().uuid().optional(),
        role: customJoi
            .string()
            .valid(...Object.values(ROLES))
            .optional(),
    }),
});

const updateNotification = customJoi.object({
    params: customJoi.object({
        id: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        title: customJoi.string().trim().max(255).optional(),
        message: customJoi.string().trim().optional(),
        read: customJoi.boolean().optional(),
    }).min(1),
});

const clearNotifications = customJoi.object({
    query: customJoi.object({
        userId: customJoi.string().uuid().optional(),
    }),
});

const registerPushToken = customJoi.object({
    body: customJoi.object({
        token: customJoi.string().trim().required(),
        platform: customJoi.string().valid('ios', 'android', 'web').optional(),
    }),
});

const removePushToken = customJoi.object({
    body: customJoi.object({
        token: customJoi.string().trim().optional(),
    }).optional(),
});

const testPushNotification = customJoi.object({
    body: customJoi.object({
        title: customJoi.string().trim().max(255).optional(),
        message: customJoi.string().trim().optional(),
    }).optional(),
});

module.exports = {
    notificationIdParam,
    listNotifications,
    createNotification,
    updateNotification,
    clearNotifications,
    registerPushToken,
    removePushToken,
    testPushNotification,
};
