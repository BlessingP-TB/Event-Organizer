const { app } = require('../configs/index.config');
const { ApiError } = require('./error.util');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/index.constants');

const idempotencyStore = new Map();

const cleanExpiredKeys = () => {
    const now = Date.now();
    const ttl = app.idempotencyKeyTtlHours * 60 * 60 * 1000;
    idempotencyStore.forEach((value, key) => {
        if (now - value.timestamp > ttl) {
            idempotencyStore.delete(key);
        }
    });
};
setInterval(cleanExpiredKeys, 60 * 60 * 1000);

const checkIdempotency = (key) => {
    if (!key) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            ERROR_MESSAGES.IDEMPOTENCY_KEY_REQUIRED,
            'IDEMPOTENCY_KEY_REQUIRED'
        );
    }

    const storedRequest = idempotencyStore.get(key);
    const now = Date.now();
    const ttl = app.idempotencyKeyTtlHours * 60 * 60 * 1000;

    if (storedRequest) {
        if (now - storedRequest.timestamp > ttl) {
            idempotencyStore.delete(key);
        } else {
            if (storedRequest.status === 'processing') {
                throw new ApiError(
                    HTTP_STATUS.CONFLICT,
                    ERROR_MESSAGES.IDEMPOTENCY_CONFLICT,
                    'IDEMPOTENCY_CONFLICT_PROCESSING'
                );
            }
            if (storedRequest.status === 'completed') {
                return {
                    isDuplicate: true,
                    response: storedRequest.response,
                    statusCode: storedRequest.statusCode,
                };
            }
        }
    }

    idempotencyStore.set(key, {
        status: 'processing',
        timestamp: now,
    });

    return { isDuplicate: false };
};

const storeIdempotencyResponse = (key, statusCode, response) => {
    idempotencyStore.set(key, {
        status: 'completed',
        timestamp: Date.now(),
        statusCode,
        response,
    });
};

const clearIdempotency = (key) => {
    idempotencyStore.delete(key);
};

module.exports = {
    checkIdempotency,
    storeIdempotencyResponse,
    clearIdempotency,
};
