const express = require('express');
const {
    registrationController,
} = require('../controllers/index.controller');
const {
    authenticate,
    authorize,
    enforceEmailVerification,
} = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();

router.use(authenticate);

router.post(
    '/:eventId',
    authorize([ROLES.ADMIN, ROLES.ORGANIZER, ROLES.ATTENDEE]),
    enforceEmailVerification,
    registrationController.createRegistration
);

router.get(
    '/my/:eventId',
    authorize([ROLES.ADMIN, ROLES.ORGANIZER, ROLES.ATTENDEE]),
    enforceEmailVerification,
    registrationController.getMyRegistration
);

router.get(
    '/total',
    authorize([ROLES.ADMIN, ROLES.ORGANIZER]),
    enforceEmailVerification,
    registrationController.getApprovedRegistrationsForOrganizer
);

router.get(
    '/my',
    authorize([ROLES.ADMIN, ROLES.ORGANIZER, ROLES.ATTENDEE]),
    enforceEmailVerification,
    registrationController.listMyRegistrations
);

router.patch(
    '/:id/decision',
    authorize([ROLES.ADMIN, ROLES.ORGANIZER]),
    enforceEmailVerification,
    registrationController.decideRegistration
);

module.exports = router;