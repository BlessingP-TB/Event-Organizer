const express = require('express');
const ratingController = require('../controllers/rating.controller');
const ratingValidation = require('../validations/rating.validation');
const { validate, authenticate } = require('../middlewares/index.middleware');

const router = express.Router();

router.post(
    '/',
    authenticate,
    validate(ratingValidation.createRating),
    ratingController.createRating
);

router.get(
    '/:eventId',
    authenticate,
    validate(ratingValidation.getEventRatings),
    ratingController.getEventRatings
);

module.exports = router;
