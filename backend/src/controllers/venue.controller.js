const { venueService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const listPublicVenues = catchAsync(async (req, res) => {
    const paginatedResult = await venueService.listPublicVenues(req.query);
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const listAllVenues = catchAsync(async (req, res) => {
    const paginatedResult = await venueService.listAllVenues(req.query);
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const getVenue = catchAsync(async (req, res) => {
    const venue = await venueService.getVenueById(req.params.id);
    res.status(HTTP_STATUS.OK).send(venue);
});

const getBookedSlots = catchAsync(async (req, res) => {
    const { from, to } = req.query;
    const slots = await venueService.getBookedSlots(
        req.params.venueId,
        from,
        to
    );
    res.status(HTTP_STATUS.OK).send(slots);
});

module.exports = {
    listPublicVenues,
    listAllVenues,
    getVenue,
    getBookedSlots,
};

