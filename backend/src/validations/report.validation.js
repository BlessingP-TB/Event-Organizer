const { customJoi, uuidParam } = require('./custom.validation');

const eventIdParam = uuidParam('eventId');
const reportIdParam = uuidParam('id');

const createReport = eventIdParam.keys({
    body: customJoi.object({
        content: customJoi.string().min(10).required(),
    }),
});

const listReports = eventIdParam;

const updateReport = reportIdParam.keys({
    body: customJoi.object({
        content: customJoi.string().min(10).required(),
    }),
});

const deleteReport = reportIdParam;

module.exports = {
    eventIdParam,
    reportIdParam,
    createReport,
    listReports,
    updateReport,
    deleteReport,
};

