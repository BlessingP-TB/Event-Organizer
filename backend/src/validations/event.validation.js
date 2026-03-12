const {
    customJoi,
    uuidParam,
    basePaginationQuery,
} = require('./custom.validation');
const { EVENT_STATUS } = require('../constants/index.constants');

const eventIdParam = uuidParam('eventId');

const listPublicEvents = customJoi.object({
    query: basePaginationQuery.keys({
        name: customJoi.string().optional(),
        location: customJoi.string().optional(),
        themeName: customJoi.string().optional(),
    }),
});

const listAdminEvents = customJoi.object({
    query: basePaginationQuery,
});

const listOrganizerEvents = customJoi.object({
    query: basePaginationQuery.keys({
        includeThemeImage: customJoi.boolean().optional(),
    }),
});

const ticketDefinitionSchema = customJoi.object({
    name: customJoi.string().required(),
    price: customJoi.number().min(0).required(),
    quantity: customJoi.number().integer().min(1).required(),
});

const createEvent = customJoi.object({
    body: customJoi.object({
        name: customJoi.string().required(),
        description: customJoi.string().required(),
        venueId: customJoi.string().uuid().required(),
        themeId: customJoi.string().uuid().allow(null).optional(),
        startDateTime: customJoi.date().iso().required(),
        endDateTime: customJoi
            .date()
            .iso()
            .greater(customJoi.ref('startDateTime'))
            .required(),
        expectedAttend: customJoi.number().integer().min(1).optional(),
        isFree: customJoi.boolean().default(false),
        ticketRequired: customJoi.boolean().optional(),
        autoDistribute: customJoi.boolean().optional(),
        ticketDefinitions: customJoi
            .array()
            .items(ticketDefinitionSchema)
            .min(1)
            .optional(),

        // ✅ Add these two fields
        resources: customJoi.array().items(
            customJoi.object({
                name: customJoi.string().required(),
                quantity: customJoi.number().integer().min(1).required()
            })
        ).optional(),
        services: customJoi.object().pattern(
            customJoi.string(), 
            customJoi.boolean()
        ).optional(),
        submitForApproval: customJoi.boolean().optional(),
    }),
});

const submitDraft = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
});

const writtenAssignCreate = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        staffCount: customJoi.number().integer().min(2).max(4).required(),
    }),
});

const writtenAssignLogin = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        username: customJoi.string().trim().required(),
        password: customJoi.string().trim().required(),
    }),
});

const writtenAssignRedeem = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        qrData: customJoi.string().trim().required(),
    }),
});


const updateEvent = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        name: customJoi.string().optional(),
        description: customJoi.string().optional(),
        venueId: customJoi.string().uuid().optional(),
        themeId: customJoi.string().uuid().allow(null).optional(),
        startDateTime: customJoi.date().iso().optional(),
        endDateTime: customJoi.date().iso().optional(),
        isFree: customJoi.boolean().optional(),
        ticketRequired: customJoi.boolean().optional(),

        // ✅ Add resources and services for updates
        resources: customJoi.array().items(
            customJoi.object({
                name: customJoi.string().required(),
                quantity: customJoi.number().integer().min(1).required()
            })
        ).optional(),
        services: customJoi.object().pattern(
            customJoi.string(),
            customJoi.boolean()
        ).optional(),
    }),
});


const setEventStatus = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        status: customJoi
            .string()
            .valid(...Object.values(EVENT_STATUS))
            .required(),
    }),
});

const approveImmediateBooking = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        reason: customJoi.string().required(),
    }),
});

const cancelEvent = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        reason: customJoi.string().trim().min(5).max(500).required(),
    }),
});

const requestReschedule = customJoi.object({
    params: customJoi.object({
        eventId: customJoi.string().uuid().required(),
    }),
    body: customJoi.object({
        startDateTime: customJoi.date().iso().required(),
        endDateTime: customJoi
            .date()
            .iso()
            .greater(customJoi.ref('startDateTime'))
            .required(),
        venueId: customJoi.string().uuid().optional(),
        reason: customJoi.string().trim().min(5).max(500).required(),
    }),
});

module.exports = {
    eventIdParam,
    listPublicEvents,
    listAdminEvents,
    listOrganizerEvents,
    createEvent,
    updateEvent,
    setEventStatus,
    approveImmediateBooking,
    cancelEvent,
    requestReschedule,
    submitDraft,
    writtenAssignCreate,
    writtenAssignLogin,
    writtenAssignRedeem,
};