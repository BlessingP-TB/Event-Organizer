const { cors: corsEnv } = require('./environment.config');

function isLoopbackOrigin(origin) {
    try {
        const { hostname } = new URL(origin);
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    } catch (_) {
        return false;
    }
}

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, Postman)
        if (!origin) return callback(null, true);

        const normalizedOrigin = origin.toLowerCase().replace(/\/$/, '');
        const normalizedAllowedOrigins = corsEnv.allowedOrigins.map(o => o.toLowerCase().trim());

        if (isLoopbackOrigin(normalizedOrigin)) return callback(null, true);

        if (normalizedAllowedOrigins.includes(normalizedOrigin)) {
            return callback(null, true);
        } else {
            console.warn(`CORS blocked: ${origin}`);
            return callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Idempotency-Key',
        'Cache-Control', // needed for browser preflight
    ],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
};

module.exports = corsOptions;
