const express = require('express');
const { notificationController } = require('../controllers/index.controller');
const { authenticate, authorize } = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();

router.use(authenticate);

router.get(
    '/',
    authorize([ROLES.ADMIN, ROLES.ORGANIZER, ROLES.ATTENDEE]),
    notificationController.listMyNotifications
);

module.exports = router;
