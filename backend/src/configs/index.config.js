const appConfig = require('./app.config');
const authConfig = require('./auth.config');
const corsConfig = require('./cors.config');
const envConfig =require('./environment.config');
const rateLimitConfig = require('./rateLimit.config');

module.exports = {
    app: appConfig,
    auth: authConfig,
    cors: corsConfig,
    env: envConfig,
    rateLimit: rateLimitConfig,
};

