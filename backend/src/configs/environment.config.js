const Joi = require('joi');

const envVarsSchema = Joi.object()
    .keys({
        NODE_ENV: Joi.string().valid('production', 'development', 'test').default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRY: Joi.string().default('30m'),
        JWT_REFRESH_EXPIRY: Joi.string().default('30d'),
        JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number().default(1440),
        JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number().default(60),
        BCRYPT_ROUNDS: Joi.number().default(10),
        PASSWORD_MIN_LENGTH: Joi.number().default(10),
        API_PREFIX: Joi.string().default(''),
        CLIENT_URL: Joi.string().when('NODE_ENV', { is: 'development', then: Joi.optional().default('http://localhost:3001'), otherwise: Joi.required() }),
        CORS_ALLOWED_ORIGINS: Joi.string().when('NODE_ENV', { is: 'development', then: Joi.optional().default('http://localhost:3000,http://localhost:3001,http://localhost:8081'), otherwise: Joi.required() }),
        ENABLE_EMAILS: Joi.boolean().default(false),
        EMAIL_HOST: Joi.string().when('ENABLE_EMAILS', { is: true, then: Joi.required() }),
        EMAIL_PORT: Joi.number().when('ENABLE_EMAILS', { is: true, then: Joi.required() }),
        EMAIL_USER: Joi.string().when('ENABLE_EMAILS', { is: true, then: Joi.required() }),
        EMAIL_PASS: Joi.string().when('ENABLE_EMAILS', { is: true, then: Joi.required() }),
        EMAIL_FROM: Joi.string().when('ENABLE_EMAILS', { is: true, then: Joi.required() }),
        ENABLE_FILE_UPLOAD: Joi.boolean().default(true),
        MAX_FILE_SIZE: Joi.number().default(5 * 1024 * 1024),
        ALLOWED_FILE_TYPES: Joi.string().default('image/jpeg,image/png,image/jpg,application/pdf'),
        STORAGE_STRATEGY: Joi.string().valid('DB', 'BLOB').default('DB'),
        STORAGE_DATABASE_URL: Joi.string().when('STORAGE_STRATEGY', { is: 'DB', then: Joi.optional() }),
        BLOB_HANDLER: Joi.string().valid('azure', 'aws').default('azure'),
        BLOB_STORAGE_CONNECTION_STRING: Joi.string().when('STORAGE_STRATEGY', {
            is: 'BLOB',
            then: Joi.when('BLOB_HANDLER', { is: 'azure', then: Joi.required(), otherwise: Joi.optional() })
        }),
        BLOB_STORAGE_CONTAINER_NAME: Joi.string().when('STORAGE_STRATEGY', {
            is: 'BLOB',
            then: Joi.when('BLOB_HANDLER', { is: 'azure', then: Joi.required(), otherwise: Joi.optional() })
        }),
        S3_ENDPOINT: Joi.string().when('STORAGE_STRATEGY', {
            is: 'BLOB',
            then: Joi.when('BLOB_HANDLER', { is: 'aws', then: Joi.required(), otherwise: Joi.optional() })
        }),
        S3_ACCESS_KEY_ID: Joi.string().when('STORAGE_STRATEGY', {
            is: 'BLOB',
            then: Joi.when('BLOB_HANDLER', { is: 'aws', then: Joi.required(), otherwise: Joi.optional() })
        }),
        S3_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_STRATEGY', {
            is: 'BLOB',
            then: Joi.when('BLOB_HANDLER', { is: 'aws', then: Joi.required(), otherwise: Joi.optional() })
        }),
        S3_REGION: Joi.string().when('STORAGE_STRATEGY', {
            is: 'BLOB',
            then: Joi.when('BLOB_HANDLER', { is: 'aws', then: Joi.required(), otherwise: Joi.optional() })
        }),
        S3_BUCKET: Joi.string().when('STORAGE_STRATEGY', {
            is: 'BLOB',
            then: Joi.when('BLOB_HANDLER', { is: 'aws', then: Joi.required(), otherwise: Joi.optional() })
        }),
        ENABLE_RATE_LIMITING: Joi.boolean().default(true),
        RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000),
        RATE_LIMIT_MAX_REQUESTS: Joi.number().default(200),
        PAYSTACK_SECRET_KEY: Joi.string().when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.optional() }),
        PAYSTACK_PUBLIC_KEY: Joi.string().when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.optional() })
    })
    .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);
if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

function parseExpiryToMs(expiryString) {
    const unit = expiryString.slice(-1).toLowerCase();
    const value = parseInt(expiryString.slice(0, -1), 10);
    if (isNaN(value)) {
        return 2592000000;
    }
    switch (unit) {
        case 'd':
            return value * 24 * 60 * 60 * 1000;
        case 'h':
            return value * 60 * 60 * 1000;
        case 'm':
            return value * 60 * 1000;
        default:
            return 2592000000;
    }
}

module.exports = {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    databaseUrl: envVars.DATABASE_URL,
    jwt: {
        secret: envVars.JWT_SECRET,
        refreshSecret: envVars.JWT_REFRESH_SECRET,
        accessExpiry: envVars.JWT_ACCESS_EXPIRY,
        refreshExpiry: envVars.JWT_REFRESH_EXPIRY,
        refreshExpiryMs: parseExpiryToMs(envVars.JWT_REFRESH_EXPIRY),
        verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
        resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES
    },
    encryption: {
        bcryptRounds: envVars.BCRYPT_ROUNDS,
        passwordMinLength: envVars.PASSWORD_MIN_LENGTH
    },
    api: {
        prefix: envVars.API_PREFIX
    },
    clientUrl: envVars.CLIENT_URL,
    cors: {
        allowedOrigins: envVars.CORS_ALLOWED_ORIGINS.split(',')
    },
    email: {
        enabled: envVars.ENABLE_EMAILS,
        host: envVars.EMAIL_HOST,
        port: envVars.EMAIL_PORT,
        user: envVars.EMAIL_USER,
        pass: envVars.EMAIL_PASS,
        from: envVars.EMAIL_FROM
    },
    storage: {
        uploadsEnabled: envVars.ENABLE_FILE_UPLOAD,
        maxFileSize: envVars.MAX_FILE_SIZE,
        allowedMimeTypes: envVars.ALLOWED_FILE_TYPES.split(','),
        strategy: envVars.STORAGE_STRATEGY,
        dbUrl: envVars.STORAGE_DATABASE_URL,
        blob: {
            handler: envVars.BLOB_HANDLER,
            azure: {
                connectionString: envVars.BLOB_STORAGE_CONNECTION_STRING,
                containerName: envVars.BLOB_STORAGE_CONTAINER_NAME
            },
            aws: {
                endpoint: envVars.S3_ENDPOINT,
                accessKeyId: envVars.S3_ACCESS_KEY_ID,
                secretAccessKey: envVars.S3_SECRET_ACCESS_KEY,
                region: envVars.S3_REGION,
                bucket: envVars.S3_BUCKET
            }
        }
    },
    rateLimit: {
        enabled: envVars.ENABLE_RATE_LIMITING,
        windowMs: envVars.RATE_LIMIT_WINDOW_MS,
        maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS
    },
    payment: {
        paystackSecretKey: envVars.PAYSTACK_SECRET_KEY,
        paystackPublicKey: envVars.PAYSTACK_PUBLIC_KEY
    }
};
