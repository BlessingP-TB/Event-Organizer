const express = require('express');
const {
    userController,
    documentController,
    purchaseController,
    ticketController,
    registrationController,
} = require('../controllers/index.controller');
const {
    userValidation,
    documentValidation,
    purchaseValidation,
    registrationValidation,
} = require('../validations/index.validation');
const {
    validate,
    authenticate,
    authorize,
    enforceEmailVerification,
    upgradeLimiter,
} = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();

router.use(authenticate);

router
    .route('/me')
    .get(userController.getMyProfile)
    .patch(
        validate(userValidation.updateUserProfile),
        userController.updateMyProfile
    );

router.get('/me/sessions', userController.getMySessions);
router.delete(
    '/me/sessions/:id',
    validate(userValidation.deleteSession),
    userController.deleteSession
);

router
    .route('/me/documents')
    .get(documentController.listMyDocuments)
    .post(
        enforceEmailVerification,
        validate(documentValidation.uploadUserDocument),
        documentController.uploadUserDocument
    );

router.get(
    '/me/purchases',
    validate(purchaseValidation.listPurchases),
    purchaseController.listMyPurchases
);
router.get('/me/tickets', ticketController.listMyTickets);
router.get(
    '/me/registrations',
    validate(registrationValidation.listMyRegistrations),
    registrationController.listMyRegistrations
);

router.post(
    '/me/request-organizer-upgrade',
    authorize(ROLES.ATTENDEE),
    //enforceEmailVerification,
    //(req, res, next) => upgradeLimiter(req, res, next),
    //validate(userValidation.requestOrganizerUpgrade),
    userController.requestOrganizerUpgrade
);

module.exports = router;