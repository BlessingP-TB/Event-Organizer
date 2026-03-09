const {
    globalLimiter,
    authLimiter,
    upgradeLimiter,
    purchaseLimiter,
} = require('../configs/rateLimit.config');

module.exports = {
    globalLimiter,
    authLimiter,
    upgradeLimiter,
    purchaseLimiter,
};

