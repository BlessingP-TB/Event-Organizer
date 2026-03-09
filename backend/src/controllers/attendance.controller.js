const { attendanceService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const checkIn = catchAsync(async (req, res) => {
    const { eventId } = req.params;
    const { userId } = req.body;
    const attendance = await attendanceService.checkInUser(eventId, userId);
    res.status(HTTP_STATUS.OK).send(attendance);
});

const checkOut = catchAsync(async (req, res) => {
    const { eventId } = req.params;
    const { userId } = req.body;
    const attendance = await attendanceService.checkOutUser(eventId, userId);
    res.status(HTTP_STATUS.OK).send(attendance);
});

module.exports = {
    checkIn,
    checkOut,
};
