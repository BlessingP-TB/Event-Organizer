const {
    authenticate,
    authorize,
    enforceEmailVerification,
} = require('./auth.middleware');
const { globalErrorHandler } = require('./error.middleware');
const idempotency = require('./idempotency.middleware');
const {
    checkEventOwner,
    checkPurchaseOwner,
    checkTicketOwner,
} = require('./ownership.middleware');
const {
    checkDocumentOwnerOrAdmin,
} = require('./document.middleware');
const {
    globalLimiter,
    authLimiter,
    upgradeLimiter,
    purchaseLimiter,
} = require('./rateLimit.middleware');
const { preventAdminAccess } = require('./gate.middleware');
const upload = require('./upload.middleware');
const validate = require('./validation.middleware');

module.exports = {
    authenticate,
    authorize,
    enforceEmailVerification,
    globalErrorHandler,
    idempotency,
    checkEventOwner,
    checkPurchaseOwner,
    checkTicketOwner,
    checkDocumentOwnerOrAdmin,
    globalLimiter,
    authLimiter,
    upgradeLimiter,
    purchaseLimiter,
    preventAdminAccess,
    upload,
    validate,
};