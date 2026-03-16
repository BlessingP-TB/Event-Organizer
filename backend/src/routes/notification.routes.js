const express = require('express');
const { notificationController } = require('../controllers/index.controller');
const { notificationValidation } = require('../validations/index.validation');
const { validate, authenticate } = require('../middlewares/index.middleware');

const router = express.Router();

router.get(
    '/',
    authenticate,
    validate(notificationValidation.listNotifications),
    notificationController.listNotifications
);

router.post(
    '/',
    authenticate,
    validate(notificationValidation.createNotification),
    notificationController.createNotification
);

router.post(
    '/push-token',
    authenticate,
    validate(notificationValidation.registerPushToken),
    notificationController.registerPushToken
);

router.delete(
    '/push-token',
    authenticate,
    validate(notificationValidation.removePushToken),
    notificationController.removePushToken
);

router.post(
    '/test',
    authenticate,
    validate(notificationValidation.testPushNotification),
    notificationController.sendTestPushNotification
);

router.patch(
    '/:id',
    authenticate,
    validate(notificationValidation.updateNotification),
    notificationController.updateNotification
);

router.delete(
    '/:id',
    authenticate,
    validate(notificationValidation.notificationIdParam),
    notificationController.deleteNotification
);

router.delete(
    '/',
    authenticate,
    validate(notificationValidation.clearNotifications),
    notificationController.clearNotifications
);

module.exports = router;
