const { customJoi } = require('./custom.validation');

const checkIn = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        userId: customJoi.string().uuid().required(),
    }),
});

const checkOut = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        userId: customJoi.string().uuid().required(),
    }),
});

module.exports = {
    checkIn,
    checkOut,
};