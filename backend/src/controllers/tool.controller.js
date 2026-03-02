const { toolService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const listPublicTools = catchAsync(async (req, res) => {
    const tools = await toolService.listTools();
    res.status(HTTP_STATUS.OK).send(tools);
});

const listAllTools = catchAsync(async (req, res) => {
    const paginatedResult = await toolService.listAllTools(req.query);
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const getTool = catchAsync(async (req, res) => {
    const tool = await toolService.getToolById(req.params.id);
    res.status(HTTP_STATUS.OK).send(tool);
});

module.exports = {
    listPublicTools,
    listAllTools,
    getTool,
};

