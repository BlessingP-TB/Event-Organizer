// src/validation/calendar.validation.js
const Joi = require('joi');

const createCalendar = {
  body: Joi.object().keys({
    date: Joi.date().iso().required(),
    startTime: Joi.string().required(),
    endTime: Joi.string().required(),
    venueIds: Joi.array().items(Joi.string()).required(),
  }),
};

const updateCalendar = {
  body: Joi.object().keys({
    date: Joi.date().iso(),
    startTime: Joi.string(),
    endTime: Joi.string(),
    venueIds: Joi.array().items(Joi.string()),
  }),
};

module.exports = {
  createCalendar,
  updateCalendar,
};