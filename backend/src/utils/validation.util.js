const Joi = require('joi');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/index.constants');
const { ApiError } = require('./error.util');

function mutateInPlace(target, source) {
    if (!target || !source) return;
    const keys = Object.keys(target);
    for (let i = 0; i < keys.length; i++) delete target[keys[i]];
    Object.assign(target, source);
}

function isCompound(schema) {
    if (!Joi.isSchema(schema) || typeof schema.describe !== 'function') return false;
    const desc = schema.describe();
    const keys = desc && desc.type === 'object' ? desc.keys : undefined;
    return !!(keys && (keys.body || keys.query || keys.params));
}

module.exports = (schema) => (req, res, next) => {
    try {
        const wrapped = isCompound(schema)
            ? schema.prefs({ abortEarly: false })
            : Joi.object({ query: schema }).prefs({ abortEarly: false });
        const candidate = { body: req.body, query: req.query, params: req.params };
        const { value, error } = wrapped.validate(candidate, {
            allowUnknown: true,
            stripUnknown: true,
            convert: true,
        });
        if (error) {
            return next(
                new ApiError(
                    HTTP_STATUS.UNPROCESSABLE_ENTITY,
                    ERROR_MESSAGES.VALIDATION_ERROR,
                    'VALIDATION_ERROR',
                    error.details
                )
            );
        }
        if (value.query) mutateInPlace(req.query, value.query);
        if (value.params) mutateInPlace(req.params, value.params);
        if (value.body) req.body = value.body;
        return next();
    } catch (err) {
        return next(err);
    }
};