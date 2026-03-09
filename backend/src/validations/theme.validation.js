const { customJoi, uuidParam, basePaginationQuery } = require('./custom.validation');

const themeIdParam = uuidParam('id');

const listThemes = customJoi.object({
    query: basePaginationQuery.keys({
        name: customJoi.string().optional(),
    }),
});

const createTheme = customJoi.object({
    body: customJoi.object({
        name: customJoi.string().required(),
        description: customJoi.string().allow('').optional(),
        image: customJoi.string().base64().optional(),
        eventId: customJoi.string().uuid().optional()
    }),
});

const updateTheme = themeIdParam.keys({
    body: customJoi.object({
        name: customJoi.string().optional(),
        description: customJoi.string().allow('').optional(),
        image: customJoi.string().base64().optional(),
    }),
});

module.exports = {
    themeIdParam,
    listThemes,
    createTheme,
    updateTheme,
};