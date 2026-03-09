const {
    checkIdempotency,
    storeIdempotencyResponse,
    clearIdempotency,
    asyncHandler,
} = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const idem = (keySource = 'body') =>
    asyncHandler(async (req, res, next) => {
        const key = req.headers['idempotency-key'];

        const { isDuplicate, response, statusCode } = checkIdempotency(key);

        if (isDuplicate) {
            return res.status(statusCode).json(response);
        }

        const originalJson = res.json;
        res.json = (body) => {
            storeIdempotencyResponse(key, res.statusCode, body);
            return originalJson.call(res, body);
        };

        const originalSend = res.send;
        res.send = (body) => {
            storeIdempotencyResponse(key, res.statusCode, body);
            return originalSend.call(res, body);
        };

        res.once('finish', () => {
            if (res.statusCode >= 400 && res.statusCode !== HTTP_STATUS.CONFLICT) {
                clearIdempotency(key);
            }
        });

        res.once('error', (err) => {
            clearIdempotency(key);
            next(err);
        });

        next();
    });

module.exports = idem;
