const rateLimit = require('express-rate-limit');
const { rateLimit: rateLimitConfig } = require('./environment.config');

const baseConfig = {
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !rateLimitConfig.enabled,
};

const globalLimiter = rateLimit({
    ...baseConfig,
    windowMs: rateLimitConfig.windowMs,
    max: rateLimitConfig.maxRequests,
    message: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later.',
    },
});

const authLimiter = rateLimit({
    ...baseConfig,
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        code: 'TOO_MANY_REQUESTS',
        message:
            'Too many authentication attempts, please try again after 15 minutes.',
    },
});

const upgradeLimiter = rateLimit({
    ...baseConfig,
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many upgrade requests, please try again after an hour.',
    },
});

const purchaseLimiter = rateLimit({
    ...baseConfig,
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many purchase attempts, please try again after 15 minutes.',
    },
});

module.exports = {
    globalLimiter,
    authLimiter,
    upgradeLimiter,
    purchaseLimiter,
};

