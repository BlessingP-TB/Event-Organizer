const { organizerService } = require('../services/index.service');
const { catchAsync, ApiError } = require('../utils/index.util');
const { HTTP_STATUS, ERROR_MESSAGES} = require('../constants/index.constants');

const getMyOrganizerProfile = catchAsync(async (req, res) => {
    const profile = await organizerService.getOrganizerProfile(req.user.id);
    if (!profile) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.PROFILE_NOT_FOUND);
    }
    res.status(HTTP_STATUS.OK).send(profile);
});

const createOrUpdateMyProfile = catchAsync(async (req, res) => {
    const profile = await organizerService.createOrUpdateOrganizerProfile(
        req.user.id,
        req.body
    );
    res.status(HTTP_STATUS.OK).send(profile);
});

const searchUsers = catchAsync(async (req, res) => {
    const paginatedResult = await organizerService.searchUsers(req.query);
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

module.exports = {
    getMyOrganizerProfile,
    createOrUpdateMyProfile,
    searchUsers,
};
