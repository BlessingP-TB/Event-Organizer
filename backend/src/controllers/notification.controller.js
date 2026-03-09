const { notificationService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const listMyNotifications = catchAsync(async (req, res) => {
    const notifications = await notificationService.listMyNotifications(req.user.id, req.query);
    res.status(HTTP_STATUS.OK).send(notifications);
});

module.exports = {
    listMyNotifications,
};
