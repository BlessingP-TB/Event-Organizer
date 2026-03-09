const { eventService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const addTicketDefinition = catchAsync(async (req, res) => {
    const def = await eventService.addTicketDefinition(
        req.params.eventId,
        req.body,
        req.user
    );
    res.status(HTTP_STATUS.CREATED).send(def);
});

const updateTicketDefinition = catchAsync(async (req, res) => {
    const def = await eventService.updateTicketDefinition(
        req.params.defId,
        req.body,
        req.user
    );
    res.status(HTTP_STATUS.OK).send(def);
});

const deleteTicketDefinition = catchAsync(async (req, res) => {
    await eventService.deleteTicketDefinition(req.params.defId, req.user);
    res.status(HTTP_STATUS.NO_CONTENT).send();
});

module.exports = {
    addTicketDefinition,
    updateTicketDefinition,
    deleteTicketDefinition,
};