const express = require('express');
const { authController } = require('../controllers/index.controller');
const { authValidation } = require('../validations/index.validation');
const {
    validate,
    authenticate,
    authLimiter,
    preventAdminAccess,
} = require('../middlewares/index.middleware');

const router = express.Router();

router.post(
    '/register',
    //(req, res, next) => authLimiter(req, res, next),
    // preventAdminAccess,
    //validate(authValidation.register),
    (req, res, next) => authLimiter(req, res, next),
    preventAdminAccess,
    validate(authValidation.register),
    authController.register
);
router.post(
    '/login',
    (req, res, next) => authLimiter(req, res, next),
    authController.login
);
router.post(
    '/refresh',
    validate(authValidation.refresh),
    authController.refresh
);
router.post(
    '/verify-email',
    //validate(authValidation.verifyEmail),
    authController.verifyEmail
);
router.post(
    '/resend-verification',
    // validate(authValidation.resendVerification),
    authController.resendVerification
);
router.post(
    '/forgot-password',
    // validate(authValidation.forgotPassword),
    authController.forgotPassword
);
router.post(
    '/reset-password',
    //validate(authValidation.resetPassword),
    authController.resetPassword
);

router.post(
    '/change-password',
    // authenticate,
    //validate(authValidation.changePassword),
    authController.changePassword
);
router.post(
    '/logout',
    // validate(authValidation.refresh),
    authController.logout
);
router.post('/logout-all',// authenticate,
    authController.logoutAll);

module.exports = router;