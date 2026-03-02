const express = require('express');
const {
    eventController,
    purchaseController,
    registrationController,
    ticketController,
    attendanceController,
    liquorRequestController,
} = require('../controllers/index.controller');
const {
    eventValidation,
    purchaseValidation,
    registrationValidation,
    ticketValidation,
    attendanceValidation,
    liquorRequestValidation,
} = require('../validations/index.validation');
const {
    validate,
    authenticate,
    authorize,
    enforceEmailVerification,
    checkEventOwner,
    purchaseLimiter,
    idempotency,
} = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();

router.post(
    '/',
    authenticate,
    authorize(ROLES.ORGANIZER),
    // enforceEmailVerification,
    validate(eventValidation.createEvent),
    eventController.createEvent
);

router.patch(
    '/:eventId',
    /*authenticate,
    authorize(ROLES.ORGANIZER),
    enforceEmailVerification,
    validate(eventValidation.updateEvent),
    checkEventOwner,*/
    eventController.updateEvent
);
// 👇 --- ADD THIS MISSING ROUTE --- 👇
router.get(
    '/organizer',
    authenticate,
    authorize(ROLES.ORGANIZER),
    //enforceEmailVerification,
    validate(eventValidation.listOrganizerEvents),
    eventController.listOrganizerEvents // This is the new controller function
);

router.get(
    '/public',
    eventController.listPublicEvents
);
// --- END OF NEW ROUTE ---
router.delete(
    '/:eventId',
    authenticate,
    authorize(ROLES.ORGANIZER),
    //enforceEmailVerification,
    validate(eventValidation.eventIdParam),
    checkEventOwner,
    eventController.deleteEvent
);

router.post(
    '/:eventId/publish',
    authenticate,
    authorize(ROLES.ORGANIZER),
    // enforceEmailVerification,
    //validate(eventValidation.eventIdParam),
    checkEventOwner,
    eventController.publishEvent
);

router.post(
    '/:eventId/purchases',
    /* authenticate,
     enforceEmailVerification,
     (req, res, next) => purchaseLimiter(req, res, next),
     idempotency(),
     validate(purchaseValidation.createPurchase),*/
    purchaseController.createPurchase
);

router.post(
    '/:eventId/registrations',
    authenticate,
    // enforceEmailVerification,
    validate(registrationValidation.createRegistration),
    registrationController.createRegistration
);

router.post(
    '/:eventId/tickets',
    authenticate,
    authorize(ROLES.ORGANIZER),
    //enforceEmailVerification,
    idempotency(),
    validate(ticketValidation.issueTicket),
    checkEventOwner,
    ticketController.issueTicket
);

router.get(
    '/:eventId/tickets',
    authenticate,
    authorize(ROLES.ORGANIZER),
    validate(eventValidation.eventIdParam),
    checkEventOwner,
    ticketController.listEventTickets
);

router.post(
    '/:eventId/tickets/:ticketId/redeem',
    authenticate,
    authorize(ROLES.ORGANIZER),
    // enforceEmailVerification,
    idempotency(),
    validate(ticketValidation.redeemTicket),
    checkEventOwner,
    ticketController.redeemTicket
);

router.post(
    '/:eventId/attendance/check-in',
    authenticate,
    authorize(ROLES.ORGANIZER),
    // enforceEmailVerification,
    idempotency(),
    validate(attendanceValidation.checkIn),
    checkEventOwner,
    attendanceController.checkIn
);

router.post(
    '/:eventId/attendance/check-out',
    authenticate,
    authorize(ROLES.ORGANIZER),
    //enforceEmailVerification,
    idempotency(),
    validate(attendanceValidation.checkOut),
    checkEventOwner,
    attendanceController.checkOut
);

router.post(
    '/:eventId/liquor-request',
    /*  authenticate,
      authorize(ROLES.ORGANIZER),
      enforceEmailVerification,
      validate(liquorRequestValidation.createLiquorRequest),*/
    liquorRequestController.createLiquorRequest
);

router.get(
    '/:eventId/liquor-request',
    /* authenticate,
     authorize([ROLES.ORGANIZER, ROLES.ADMIN]),
     enforceEmailVerification,
     validate(liquorRequestValidation.eventIdParam),*/
    liquorRequestController.getEventLiquorRequest
);

module.exports = router;