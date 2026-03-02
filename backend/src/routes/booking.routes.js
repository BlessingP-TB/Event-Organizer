const express = require('express');
const { bookingController } = require('../controllers/index.controller');
const { bookingValidation } = require('../validations/index.validation');
const {
    validate,
    authenticate,
    authorize,
    enforceEmailVerification,
    idempotency,
} = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();

router.use(authenticate, enforceEmailVerification);

router.get(
    '/bookings',
    authorize(ROLES.ADMIN),
    validate(bookingValidation.listBookings),
    bookingController.listAllBookings
);

router.get(
    '/me/bookings',
    authorize(ROLES.ORGANIZER),
    validate(bookingValidation.listBookings),
    bookingController.listMyBookings
);

router
    .route('/bookings/:id')
    .get(
        authorize([ROLES.ADMIN, ROLES.ORGANIZER]),
        validate(bookingValidation.bookingIdParam),
        bookingController.getBooking
    );

router.post(
    '/bookings/:id/pay',
    authorize(ROLES.ORGANIZER),
    idempotency(),
    validate(bookingValidation.payBooking),
    bookingController.payBookingInvoice
);

router.patch(
    '/bookings/:id/cancel',
    authorize([ROLES.ADMIN, ROLES.ORGANIZER]),
    validate(bookingValidation.bookingIdParam),
    bookingController.cancelBooking
);

module.exports = router;