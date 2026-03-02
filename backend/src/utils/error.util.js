const { env } = require('../configs/environment.config');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/index.constants');
const logger = require('./logger.util');

class ApiError extends Error {
    constructor(
        statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code = null,
        details = null,
        isOperational = true,
        stack = ''
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code || this.getCodeFromStatusCode(statusCode);
        this.details = details;
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    getCodeFromStatusCode(statusCode) {
        const statusMap = {
            [HTTP_STATUS.BAD_REQUEST]: 'BAD_REQUEST',
            [HTTP_STATUS.UNAUTHORIZED]: 'UNAUTHORIZED',
            [HTTP_STATUS.FORBIDDEN]: 'FORBIDDEN',
            [HTTP_STATUS.NOT_FOUND]: 'NOT_FOUND',
            [HTTP_STATUS.CONFLICT]: 'CONFLICT',
            [HTTP_STATUS.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
            [HTTP_STATUS.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
            [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
        };
        return statusMap[statusCode] || 'UNKNOWN_ERROR';
    }
}

const handleJoiError = (err) => {
    const message = ERROR_MESSAGES.VALIDATION_ERROR;
    const details = err.details.map((d) => ({
        message: d.message,
        field: d.path.join('.'),
    }));
    return new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        message,
        'VALIDATION_ERROR',
        details
    );
};

const handlePrismaError = (err) => {
    let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let message;
    let code = 'DB_ERROR';
    let details = null;

    switch (err.code) {
        case 'P2002':
            statusCode = HTTP_STATUS.CONFLICT;
            message = `A record with this ${err.meta.target.join(', ')} already exists.`;
            code = 'UNIQUE_CONSTRAINT_FAILED';
            details = { fields: err.meta.target };
            break;
        case 'P2025':
            statusCode = HTTP_STATUS.NOT_FOUND;
            message = 'The requested record was not found.';
            code = 'RECORD_NOT_FOUND';
            break;
        default:
            message = 'A database error occurred.';
            break;
    }
    return new ApiError(statusCode, message, code, details, false);
};

const globalErrorHandler = (err, req, res, next) => {
    if (err.name === 'ValidationError' && err.isJoi) {
        err = handleJoiError(err);
    }

    if (err.name === 'PrismaClientKnownRequestError') {
        err = handlePrismaError(err);
    }

    if (!(err instanceof ApiError)) {
        const statusCode = err.statusCode
            ? HTTP_STATUS.BAD_REQUEST
            : HTTP_STATUS.INTERNAL_SERVER_ERROR;
        const message = err.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
        err = new ApiError(
            statusCode,
            message,
            null,
            null,
            false,
            err.stack
        );
    }

    const response = {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
        correlationId: req.correlationId || null,
    };

    if (env !== 'production' && err.stack) {
        response.stack = err.stack;
    }

    if (!err.isOperational && env !== 'development') {
        logger.error('Non-operational error:', err);
    } else {
        logger.warn('API error:', {
            error: response,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
        });
    }

    res.status(err.statusCode).send(response);
};

module.exports = {
    ApiError,
    globalErrorHandler,
};