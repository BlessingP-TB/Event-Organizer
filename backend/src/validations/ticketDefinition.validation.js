const { customJoi, uuidParam } = require('./custom.validation');

const ticketDefinitionSchema = customJoi.object({
    name: customJoi.string().required(),
    price: customJoi.number().min(0).required(),
    quantity: customJoi.number().integer().min(1).required(),
});

const addTicketDefinition = uuidParam('eventId').keys({
    body: ticketDefinitionSchema,
});

const updateTicketDefinition = uuidParam('defId').keys({
    body: customJoi.object({
        name: customJoi.string().optional(),
        price: customJoi.number().min(0).optional(),
        quantity: customJoi.number().integer().min(1).optional(),
    }),
});

const deleteTicketDefinition = uuidParam('defId');

module.exports = {
    addTicketDefinition,
    updateTicketDefinition,
    deleteTicketDefinition,
};