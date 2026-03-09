const { customJoi, uuidParam, paginationQuery } = require('./custom.validation');

const listTools = paginationQuery;
const deleteTool = uuidParam('id');

const createTool = customJoi.object({
    body: customJoi.object({
        name: customJoi.string().required(),
        quantity: customJoi.number().integer().min(0).required(),
    }),
});

const updateTool = customJoi.object({
    params: customJoi.object({
        id: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        name: customJoi.string().optional(),
        quantity: customJoi.number().integer().min(0).optional(),
        active: customJoi.boolean().optional(),
    }),
});

module.exports = {
    listTools,
    createTool,
    updateTool,
    deleteTool,
};
