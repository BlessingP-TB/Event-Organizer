const { ApiError, globalErrorHandler } = require('./error.util');
const asyncHandler = require('./asyncHandler.util');
const {
    checkIdempotency,
    storeIdempotencyResponse,
    clearIdempotency,
} = require('./idempotency.util');
const logger = require('./logger.util');
const { getPagination, createPaginatedResponse } = require('./pagination.util');
const pdfUtil = require('./pdf.util');
const blobUtil = require('./blob.util');
const prisma = require('./prisma.util');
const {
    generateToken,
    verifyToken,
    generateAuthTokens,
    generateVerifyEmailToken,
    generateResetPasswordToken,
} = require('./token.util');
const validate = require('./validation.util');
const {
    safeUserSelect,
    safeAdminUserSelect,
} = require('./prismaSelects.util');

module.exports = {
    ApiError,
    globalErrorHandler,
    asyncHandler,
    catchAsync: asyncHandler,
    checkIdempotency,
    storeIdempotencyResponse,
    clearIdempotency,
    logger,
    getPagination,
    createPaginatedResponse,
    pdfUtil,
    prisma,
    generateToken,
    verifyToken,
    generateAuthTokens,
    generateVerifyEmailToken,
    generateResetPasswordToken,
    validate,
    safeUserSelect,
    safeAdminUserSelect,
    blobUtil
};