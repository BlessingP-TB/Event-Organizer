const express = require('express');
const { venueController } = require('../controllers/index.controller');
const { venueValidation } = require('../validations/index.validation');
const { validate } = require('../middlewares/index.middleware');

const router = express.Router();

router.get(
    '/',
    validate(venueValidation.listPublicVenues),
    venueController.listPublicVenues
);
router.get('/:id', venueController.getVenue);
router.get(
    '/:venueId/booked-slots',
    validate(venueValidation.getVenueBookedSlots),
    venueController.getBookedSlots
);

module.exports = router;
