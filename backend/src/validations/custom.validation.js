const Joi = require('joi');
const { auth } = require('../configs/index.config');

const customJoi = Joi.extend((joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.password': auth.passwordPolicy.errorMessage,
        'string.guid': '{{#label}} must be a valid UUID',
    },
    rules: {
        password: {
            validate(value, helpers) {
                if (!auth.passwordPolicy.regex.test(value)) {
                    return helpers.error('string.password');
                }
                return value;
            },
        },
    },
}));

const uuidParam = (paramName = 'id') =>
    customJoi.object({
        params: customJoi.object({
            [paramName]: customJoi
                .string()
                .uuid()
                .required()
                .label(`${paramName} ID`),
        }),
    });

const basePaginationQuery = customJoi.object({
    page: customJoi.number().integer().min(1).optional(),
    pageSize: customJoi.number().integer().min(1).optional(),
});

const paginationQuery = customJoi.object({
    query: basePaginationQuery,
});

module.exports = {
    customJoi,
    uuidParam,
    basePaginationQuery,
    paginationQuery,
};
