const express = require('express');
const { getFinancialStats, getMyOrganizerStats } = require('../controllers/stats.controller');
const { calendarController } = require('../controllers/index.controller');
const {
    organizerController,
    documentController,
    eventController,
} = require('../controllers/index.controller');
const {
    userValidation,
    documentValidation,
} = require('../validations/index.validation');
const {
    validate,
    authenticate,
    authorize,
    enforceEmailVerification,
} = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();
router.get('/availability', calendarController.getAllCalendars);
router.use(authenticate, authorize(ROLES.ORGANIZER), /*enforceEmailVerification*/);

router
    .route('/profile')
    .get(organizerController.getMyOrganizerProfile)
    .post(
        validate(userValidation.requestOrganizerUpgrade),
        organizerController.createOrUpdateMyProfile
    );

router.post(
    '/profile/documents',
    validate(documentValidation.uploadOrganizerDocument),
    documentController.uploadOrganizerDocument
);


router.get(
    '/events',
    eventController.listOrganizerEvents
);


router.get('/stats/dashboard', getMyOrganizerStats);
router.get('/stats/financial', getFinancialStats);


module.exports = router;
