const { customJoi, uuidParam, paginationQuery } = require('./custom.validation');
const { VENUE_TYPE, RATE_TYPE } = require('../constants/index.constants');

const listAdminVenues = paginationQuery;
const deleteVenue = uuidParam('id');
const getVenueBookedSlots = uuidParam('venueId');

const createVenue = customJoi.object({
    body: customJoi.object({
        name: customJoi.string().required(),
        location: customJoi.string().required(),
        capacity: customJoi.number().integer().min(1).required(),
        type: customJoi
            .string()
            .valid(...Object.values(VENUE_TYPE))
            .required(),
        typeOther: customJoi.string().when('type', {
            is: VENUE_TYPE.OTHER,
            then: customJoi.string().required(),
            otherwise: customJoi.string().allow(null, '').optional(),
        }),
        rateType: customJoi
            .string()
            .valid(...Object.values(RATE_TYPE))
            .required(),
        price: customJoi.number().min(0).required(),
        depositValue: customJoi.number().min(0).allow(null).optional(),
        rating: customJoi.number().integer().min(0).max(5).allow(null).optional(),
        tools: customJoi.array().items(customJoi.string().uuid()).optional(),
    }),
});

const updateVenue = customJoi.object({
    params: customJoi.object({
        id: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        name: customJoi.string().optional(),
        location: customJoi.string().optional(),
        capacity: customJoi.number().integer().min(1).optional(),
        type: customJoi
            .string()
            .valid(...Object.values(VENUE_TYPE))
            .optional(),
        typeOther: customJoi.string().when('type', {
            is: VENUE_TYPE.OTHER,
            then: customJoi.string().required(),
            otherwise: customJoi.string().allow(null, '').optional(),
        }),
        rateType: customJoi
            .string()
            .valid(...Object.values(RATE_TYPE))
            .optional(),
        price: customJoi.number().min(0).optional(),
        depositValue: customJoi.number().min(0).allow(null).optional(),
        rating: customJoi.number().integer().min(0).max(5).allow(null).optional(),
        tools: customJoi.array().items(customJoi.string().uuid()).optional(),
    }),
});

const listPublicVenues = customJoi.object({
    query: customJoi.object({
        page: customJoi.number().integer().min(1).optional(),
        pageSize: customJoi.number().integer().min(1).optional(),
        tools: customJoi
            .alternatives()
            .try(
                customJoi.string(),
                customJoi.array().items(customJoi.string())
            )
            .optional(),
        toolsMode: customJoi.string().valid('ALL', 'ANY').default('ANY'),
        capacityMin: customJoi.number().integer().min(0).optional(),
        capacityMax: customJoi.number().integer().min(0).optional(),
        location: customJoi.string().optional(),
    }),
});

const updateVenueTools = customJoi.object({
    params: customJoi.object({
        venueId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        add: customJoi.array().items(customJoi.string().uuid()).optional(),
        remove: customJoi.array().items(customJoi.string().uuid()).optional(),
    }),
});

module.exports = {
    listAdminVenues,
    createVenue,
    updateVenue,
    deleteVenue,
    listPublicVenues,
    getVenueBookedSlots,
    updateVenueTools,
};