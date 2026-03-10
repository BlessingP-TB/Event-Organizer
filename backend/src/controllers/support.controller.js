const { supportService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS, SUCCESS_MESSAGES } = require('../constants/index.constants');

const createSupportRequest = catchAsync(async (req, res) => {
    const result = await supportService.submitSupportRequest(req.user, req.body);

    res.status(HTTP_STATUS.CREATED).send({
        message: SUCCESS_MESSAGES.SUPPORT_REQUEST_SUBMITTED,
        data: result,
    });
});

module.exports = {
    createSupportRequest,
};
