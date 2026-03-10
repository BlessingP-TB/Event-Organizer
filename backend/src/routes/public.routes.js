const express = require('express');
const {
    eventController,
    venueController,
    themeController,
    toolController,
} = require('../controllers/index.controller');
const {
    eventValidation,
    venueValidation,
    themeValidation,
    uuidParam,
} = require('../validations/index.validation');
const { validate } = require('../middlewares/index.middleware');

const router = express.Router();

router.get(
    '/events',
    validate(eventValidation.listPublicEvents),
    eventController.listPublicEvents
);
router.get(
    '/events/:id',
    validate(uuidParam('id')),
    eventController.getEvent
);
router.get(
    '/events/:id/tickets',
    validate(uuidParam('id')),
    eventController.listTicketDefinitions
);

router.get(
    '/venues',
    validate(venueValidation.listPublicVenues),
    venueController.listPublicVenues
);
router.get(
    '/venues/:id',
    validate(uuidParam('id')),
    venueController.getVenue
);
router.get(
    '/venues/:venueId/booked-slots',
    validate(venueValidation.getVenueBookedSlots),
    venueController.getBookedSlots
);

router.get(
    '/themes',
    validate(themeValidation.listThemes),
    themeController.listThemes
);
router.get('/tools', toolController.listPublicTools);
router.get('/tools/:id', validate(uuidParam('id')), toolController.getTool);

module.exports = router;

