const { customJoi } = require('./custom.validation');

const createRating = customJoi.object({
    body: customJoi.object({
        eventId: customJoi.string().uuid().required(),
        rating: customJoi.number().integer().min(1).max(5).required(),
        comments: customJoi.string().trim().allow('').optional(),
        categories: customJoi.array().items(customJoi.string().trim()).optional(),
        adminName: customJoi.any().optional(),
        department: customJoi.any().optional(),
    }),
});

const getEventRatings = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
});

module.exports = {
    createRating,
    getEventRatings,
};
