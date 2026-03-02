const { registrationService } = require('../services/index.service');
const { catchAsync, ApiError } = require('../utils/index.util');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/index.constants');

const createRegistration = catchAsync(async (req, res) => {
    const registration = await registrationService.createRegistration(
        req.user.id,
        req.params.eventId,
        req.body
    );
    res.status(HTTP_STATUS.CREATED).send(registration);
});
const TEST_USER_ID = 'd5b376ad-13ef-4b59-abaa-f601083f83c6'; // Define a placeholder ID

/*const createRegistration = catchAsync(async (req, res) => {
    const registration = await registrationService.createRegistration(
        TEST_USER_ID, // 👈 FIX A: Use a placeholder ID instead of req.user.id
        req.params.eventId,
        req.body // 👈 FIX B: Pass the registration form data (req.body)
    );
    res.status(HTTP_STATUS.CREATED).send(registration);
});*/
const getMyRegistration = catchAsync(async (req, res) => {
    const registration =
        await registrationService.getRegistrationByUserAndEvent(
            req.user.id,
            req.params.eventId
        );
    if (!registration) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.REGISTRATION_NOT_FOUND);
    }
    res.status(HTTP_STATUS.OK).send(registration);
});

const listMyRegistrations = catchAsync(async (req, res) => {
    const paginatedResult = await registrationService.listUserRegistrations(
        req.user.id,
        req.query
    );
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const decideRegistration = catchAsync(async (req, res) => {
    const registration = await registrationService.decideRegistration(
        req.params.id,
        req.user,
        req.body
    );
    res.status(HTTP_STATUS.OK).send(registration);
});

const getApprovedRegistrationsForOrganizer = catchAsync(async (req, res) => {
    // 1️⃣ Get organizerId either from params (URL) or logged-in user
    const organizerId = req.params.organizerId || req.user.id;

    // 2️⃣ Call service to get total approved registrations
    const count = await registrationService.getApprovedRegistrationsForOrganizer(organizerId);

    // 3️⃣ Return JSON with a key, not raw number
    res.status(HTTP_STATUS.OK).json({ count });
});

module.exports = {
    createRegistration,
    getMyRegistration,
    listMyRegistrations,
    decideRegistration,
    getApprovedRegistrationsForOrganizer,
};
