// src/controllers/event.controller.js
const { eventService } = require('../services/index.service');
const { catchAsync, ApiError } = require('../utils/index.util'); // Assuming ApiError is available here or import from the correct path
const { HTTP_STATUS, EVENT_STATUS, ERROR_MESSAGES} = require('../constants/index.constants');

const createEvent = catchAsync(async (req, res) => {
    // Add extensive logging here to see the exact state of req.body and other relevant info
    console.log("DEBUG (Event Controller - createEvent): Raw req object inspection - URL:", req.url, "Method:", req.method);
    console.log("DEBUG (Event Controller - createEvent): Raw req.headers:", req.headers);
    console.log("DEBUG (Event Controller - createEvent): Raw req.body TYPE:", typeof req.body);
    console.log("DEBUG (Event Controller - createEvent): Raw req.body KEYS:", Object.keys(req.body || {}));
    console.log("DEBUG (Event Controller - createEvent): Raw req.body CONTENT:", req.body); // Log the full body

    // Destructure any data the controller might need *before* passing to service
    // For example, extracting organizerId from the authenticated user
    const organizerId = req.user.id; // Assuming req.user is set by authentication middleware

    // Pass the entire body (excluding organizerId if handled separately by the service)
    // and the organizerId to the service function
    const event = await eventService.createEvent(organizerId, req.body); // Pass the raw body received

    res.status(HTTP_STATUS.CREATED).send(event);
});
// C:\Users\User\Documents\BackendS2-full-app\BackendS2-full-app\src\controllers\event.controller.js

// ... (other controller functions remain the same)

const listPublicEvents = catchAsync(async (req, res) => {
    const paginatedResult = await eventService.listPublicEvents(req.query);
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const listOrganizerEvents = catchAsync(async (req, res) => {
    const paginatedResult = await eventService.listOrganizerEvents(
        req.user.id,
        req.query
    );
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});
/*const listOrganizerEvents = catchAsync(async (req, res) => {
    // !!! TEMPORARY HARDCODED ID FOR POSTMAN TESTING !!!
    const TEST_ORGANIZER_ID = '5e9b6002-15c3-4101-9941-ff134d3cff4f';

    const paginatedResult = await eventService.listOrganizerEvents(
        TEST_ORGANIZER_ID, // 👈 Use the hardcoded ID
        req.query
    );
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});*/
const getEvent = catchAsync(async (req, res) => {
    const event = await eventService.getEventById(req.params.id);
    res.status(HTTP_STATUS.OK).send(event);
});

const updateEvent = catchAsync(async (req, res) => {
    const event = await eventService.updateEvent(req.params.eventId, req.body);
    res.status(HTTP_STATUS.OK).send(event);
});

const deleteEvent = catchAsync(async (req, res) => {
    await eventService.deleteEvent(req.params.eventId);
    res.status(HTTP_STATUS.NO_CONTENT).send();
});

const publishEvent = catchAsync(async (req, res) => {
    const event = await eventService.publishEvent(req.params.eventId);
    res.status(HTTP_STATUS.OK).send(event);
});

const listTicketDefinitions = catchAsync(async (req, res) => {
    const definitions = await eventService.listEventTicketDefinitions(
        req.params.id
    );
    res.status(HTTP_STATUS.OK).send(definitions);
});

module.exports = {
    createEvent,
    listPublicEvents,
    listOrganizerEvents,
    getEvent,
    updateEvent,
    deleteEvent,
    publishEvent,
    listTicketDefinitions,
};