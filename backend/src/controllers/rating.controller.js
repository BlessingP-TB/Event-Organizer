const ratingService = require('../services/rating.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const createRating = catchAsync(async (req, res) => {
    const result = await ratingService.createRating({
        currentUser: req.user,
        body: req.body,
    });

    res.status(HTTP_STATUS.CREATED).send(result);
});

const getEventRatings = catchAsync(async (req, res) => {
    const ratings = await ratingService.getEventRatings(req.params.eventId);
    res.status(HTTP_STATUS.OK).send(ratings);
});

module.exports = {
    createRating,
    getEventRatings,
};
