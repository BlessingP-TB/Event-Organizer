const { userService, organizerService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS, SUCCESS_MESSAGES } = require('../constants/index.constants');

const getMyProfile = catchAsync(async (req, res) => {
    const user = await userService.findUserById(req.user.id);
    res.status(HTTP_STATUS.OK).send(user);
});

const updateMyProfile = catchAsync(async (req, res) => {
    const user = await userService.updateUserProfile(req.user.id, req.body);
    res.status(HTTP_STATUS.OK).send({
        message: SUCCESS_MESSAGES.PROFILE_UPDATED,
        user,
    });
});

const getMySessions = catchAsync(async (req, res) => {
    const sessions = await userService.getUserSessions(req.user.id);
    res.status(HTTP_STATUS.OK).send(sessions);
});

const deleteSession = catchAsync(async (req, res) => {
    await userService.deleteUserSession(req.user.id, req.params.id);
    res.status(HTTP_STATUS.OK).send({
        message: SUCCESS_MESSAGES.SESSION_REVOKED,
    });
});

const requestOrganizerUpgrade = catchAsync(async (req, res) => {
    const profile = await organizerService.requestOrganizerUpgrade(
        req.user.id,
        req.body
    );
    res.status(HTTP_STATUS.CREATED).send(profile);
});

module.exports = {
    getMyProfile,
    updateMyProfile,
    getMySessions,
    deleteSession,
    requestOrganizerUpgrade,
};