const { liquorRequestService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const createLiquorRequest = catchAsync(async (req, res) => {
    const liquorRequest = await liquorRequestService.createLiquorRequest(
        req.params.eventId,
        req.body,
        req.user.id
    );
    res.status(HTTP_STATUS.CREATED).send(liquorRequest);
});

const getLiquorRequest = catchAsync(async (req, res) => {
    const liquorRequest = await liquorRequestService.getLiquorRequestById(
        req.params.id
    );
    res.status(HTTP_STATUS.OK).send(liquorRequest);
});

const updateLiquorRequest = catchAsync(async (req, res) => {
    const liquorRequest = await liquorRequestService.updateLiquorRequest(
        req.params.id,
        req.body,
        req.user
    );
    res.status(HTTP_STATUS.OK).send(liquorRequest);
});

const getEventLiquorRequest = catchAsync(async (req, res) => {
    const liquorRequest =
        await liquorRequestService.getLiquorRequestByEventId(req.params.eventId);
    res.status(HTTP_STATUS.OK).send(liquorRequest);
});

module.exports = {
    createLiquorRequest,
    getLiquorRequest,
    updateLiquorRequest,
    getEventLiquorRequest,
};

