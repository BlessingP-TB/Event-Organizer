const { statsService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const getAdminStats = catchAsync(async (req, res) => {
    const stats = await statsService.getAdminDashboardStats();
    res.status(HTTP_STATUS.OK).send(stats);
});

const getFinancialStats = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    const stats = await statsService.getFinancialStats(
        new Date(startDate),
        new Date(endDate)
    );
    res.status(HTTP_STATUS.OK).send(stats);
});

const getMyOrganizerStats = catchAsync(async (req, res) => {
    const stats = await statsService.getOrganizerStats(req.user.id);
    res.status(HTTP_STATUS.OK).send(stats);
});

module.exports = {
    getAdminStats,
    getFinancialStats,
    getMyOrganizerStats,
};