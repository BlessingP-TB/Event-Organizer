const { notificationService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const listNotifications = catchAsync(async (req, res) => {
    const notifications = await notificationService.listNotifications({
        currentUser: req.user,
        userId: req.query.userId,
    });

    res.status(HTTP_STATUS.OK).send(notifications);
});

const createNotification = catchAsync(async (req, res) => {
    const created = await notificationService.createNotification({
        currentUser: req.user,
        body: req.body,
    });

    res.status(HTTP_STATUS.CREATED).send(created);
});

const updateNotification = catchAsync(async (req, res) => {
    const updated = await notificationService.updateNotification({
        currentUser: req.user,
        notificationId: req.params.id,
        body: req.body,
    });

    res.status(HTTP_STATUS.OK).send(updated);
});

const deleteNotification = catchAsync(async (req, res) => {
    await notificationService.deleteNotification({
        currentUser: req.user,
        notificationId: req.params.id,
    });

    res.status(HTTP_STATUS.NO_CONTENT).send();
});

const clearNotifications = catchAsync(async (req, res) => {
    const result = await notificationService.clearNotifications({
        currentUser: req.user,
        userId: req.query.userId,
    });

    res.status(HTTP_STATUS.OK).send(result);
});

module.exports = {
    listNotifications,
    createNotification,
    updateNotification,
    deleteNotification,
    clearNotifications,
};
