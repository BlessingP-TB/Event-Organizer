const { reportService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const createReport = catchAsync(async (req, res) => {
    const report = await reportService.createReport(
        req.user.id,
        req.params.eventId,
        req.body.content
    );
    res.status(HTTP_STATUS.CREATED).send(report);
});

const listReports = catchAsync(async (req, res) => {
    const reports = await reportService.listReportsForEvent(req.params.eventId);
    res.status(HTTP_STATUS.OK).send(reports);
});

const getReport = catchAsync(async (req, res) => {
    const report = await reportService.getReportById(
        req.params.id
    );
    res.status(HTTP_STATUS.OK).send(report);
});

const updateReport = catchAsync(async (req, res) => {
    const report = await reportService.updateReport(
        req.params.id,
        req.body.content,
        req.user
    );
    res.status(HTTP_STATUS.OK).send(report);
});

const deleteReport = catchAsync(async (req, res) => {
    await reportService.deleteReport(req.params.id, req.user);
    res.status(HTTP_STATUS.NO_CONTENT).send();
});
const getAnalyticsSummary = catchAsync(async (req, res) => {
    const summary = await reportService.getVenueAnalytics();
    res.status(HTTP_STATUS.OK).send(summary);
});

module.exports = {
    createReport,
    listReports,
    getReport,
    updateReport,
    deleteReport,
    getAnalyticsSummary,
};

