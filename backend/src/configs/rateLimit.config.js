const rateLimit = require('express-rate-limit');
const { rateLimit: rateLimitConfig, env } = require('./environment.config');
const ipKeyGenerator =
    typeof rateLimit.ipKeyGenerator === 'function'
        ? rateLimit.ipKeyGenerator
        : (ip) => ip;

const isDevelopment = env === 'development';

const baseConfig = {
    standardHeaders: true,
    legacyHeaders: false,
    // Keep protection in non-dev environments, but avoid blocking rapid local test loops.
    skip: () => !rateLimitConfig.enabled || isDevelopment,
};

const buildRetryMessage = (req) => {
    const resetTime = req.rateLimit?.resetTime;
    if (!resetTime) {
        return 'Too many authentication attempts, please try again later.';
    }

    const remainingMs = new Date(resetTime).getTime() - Date.now();
    const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
    const remainingMinutes = Math.ceil(remainingSeconds / 60);

    if (remainingMinutes <= 1) {
        return `Too many authentication attempts, please try again in ${remainingSeconds} seconds.`;
    }

    return `Too many authentication attempts, please try again in ${remainingMinutes} minutes.`;
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
    windowMs: rateLimitConfig.authWindowMs,
    max: rateLimitConfig.authMaxRequests,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
        const email = req.body?.email?.toLowerCase?.();
        const ipKey = ipKeyGenerator(req.ip);
        return `${ipKey}:${req.path}:${email || 'anonymous'}`;
    },
    message: (req) => ({
        code: 'TOO_MANY_REQUESTS',
        message: buildRetryMessage(req),
        retryAfterSeconds: req.rateLimit?.resetTime
            ? Math.max(
                1,
                Math.ceil((new Date(req.rateLimit.resetTime).getTime() - Date.now()) / 1000)
            )
            : undefined,
    }),
    handler: (req, res, _next, options) => {
        if (req.rateLimit?.resetTime) {
            const retryAfterSeconds = Math.max(
                1,
                Math.ceil((new Date(req.rateLimit.resetTime).getTime() - Date.now()) / 1000)
            );
            res.set('Retry-After', String(retryAfterSeconds));
        }
        res.status(options.statusCode).json(options.message(req, res));
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

