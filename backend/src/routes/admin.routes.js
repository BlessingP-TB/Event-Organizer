const express = require('express');
const upload = require('../configs/multer.config'); // Import the multer middleware configuration
const {
    adminController,
    documentController,
    venueIssuerController,
    systemSettingController,
    calendarController,
    bookingController,
    eventController
} = require('../controllers/index.controller');
const {
    approvalValidation,
    adminValidation,
    documentValidation,
    venueIssuerValidation,
    systemSettingValidation,
    venueValidation,
    toolValidation,
    paginationQuery,
    uuidParam,
    eventValidation,
    calendarValidation,
} = require('../validations/index.validation');
const {
    validate,
    authenticate,
    authorize,
} = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();
const themeRouter = require('./theme.routes');
const approvalRouter = require('./approval.routes');
router.use(authenticate);
router.get('/calendars', authorize([ROLES.ADMIN, ROLES.ORGANIZER]), calendarController.getAllCalendars);
router.use(authenticate, authorize(ROLES.ADMIN));
router.use('/themes', themeRouter);
router.use('/approvals', approvalRouter)
router
    .route('/users')
    .get(validate(adminValidation.listUsers),
        adminController.listUsers);

router
    .route('/users/:id')
    .get(validate(uuidParam('id')), adminController.getUser)
    .patch(validate(adminValidation.adminUpdateUser), adminController.updateUser)
    .delete(validate(uuidParam('id')), adminController.deleteUser);

router.get('/organizers', adminController.listOrganizerProfiles);
router.patch(
    '/organizers/:profileId/verify',
    validate(approvalValidation.verifyOrganizer),
    adminController.verifyOrganizerProfile
);

// --- UPDATE VENUE ROUTES TO USE Multer AND NEW CONTROLLER FUNCTIONS ---
// Use upload.any() to handle multipart/form-data, or upload.fields() if you know specific field names
router
    .route('/venues')
    .post(
        upload.any(), // Apply Multer middleware first
        validate(venueValidation.createVenue),
        adminController.createVenueWithFiles // Use the new function that handles files
    )
    .get(
        validate(venueValidation.listAdminVenues),
        adminController.listAllVenues
    );

router
    .route('/venues/:id')
    .patch(
        upload.any(), // Apply Multer middleware first
        validate(venueValidation.updateVenue),
        adminController.updateVenueWithFiles // Use the new function that handles files
    )
    .delete(validate(venueValidation.deleteVenue), adminController.deleteVenue);
// --- END OF VENUE ROUTE UPDATES ---

router
    .route('/venues/:venueId/tools')
    .patch(
        validate(venueValidation.updateVenueTools),
        adminController.updateVenueTools
    );

router
    .route('/tools')
    .post(validate(toolValidation.createTool), adminController.createTool)
    .get(validate(toolValidation.listTools), adminController.listAllTools);

router
    .route('/tools/:id')
    .patch(validate(toolValidation.updateTool), adminController.updateTool)
    .delete(validate(toolValidation.deleteTool), adminController.deleteTool);

router
    .route('/events')
    .get(
        validate(eventValidation.listAdminEvents),
        adminController.listAdminEvents
    );
router
    .route('/events/:id')
    .get(
        validate(eventValidation.listAdminEvents),
        eventController.getEvent
    );

router
    .route('/events/:eventId/status')
    .patch(
        validate(eventValidation.setEventStatus),
        adminController.setEventStatus
    );

router.post(
    '/events/:eventId/approvals',
    validate(approvalValidation.createEventApproval),
    adminController.createEventApproval
);
router.post(
    '/events/:eventId/approve-immediate',
    validate(eventValidation.approveImmediateBooking),
    adminController.approveImmediateBooking
);

router.patch(
    '/bookings/:id', // More general path for updating booking details
    validate(uuidParam('id')), // Validate the bookingId parameter
    // Add specific validation for the update body if needed later
    bookingController.updateBookingDetails // Use the updated controller function
);

router
    .route('/documents/:id/status')
    .patch(
        validate(documentValidation.updateDocumentStatus),
        documentController.updateDocumentStatus
    );

router.get(
    '/users/:userId/documents', // Define the route path
    validate(uuidParam('userId')), // Validate the userId parameter
    documentController.listDocumentsByUserId // Use the new controller function
);


router
    .route('/venue-issuers')
    .post(
        validate(venueIssuerValidation.createIssuer),
        venueIssuerController.createVenueIssuer
    )
    .get(
        validate(venueIssuerValidation.listIssuers),
        venueIssuerController.listVenueIssuers
    );
router
    .route('/venue-issuers/:id')
    .get(
        validate(venueIssuerValidation.getIssuer),
        venueIssuerController.getVenueIssuer
    )
    .patch(
        validate(venueIssuerValidation.updateIssuer),
        venueIssuerController.updateVenueIssuer
    )
    .delete(
        validate(venueIssuerValidation.deleteIssuer),
        venueIssuerController.deleteVenueIssuer
    );

router
    .route('/system-settings')
    .get(systemSettingController.getSystemSettings)
    .post(
        validate(systemSettingValidation.upsertSetting),
        systemSettingController.upsertSystemSetting
    );

router
    .route('/system-settings/:key')
    .get(
        validate(systemSettingValidation.getSetting),
        systemSettingController.getSystemSetting
    )
    .delete(
        validate(systemSettingValidation.deleteSetting),
        systemSettingController.deleteSystemSetting
    );

router
    .route('/calendars')
    .post(validate(calendarValidation.createCalendar), calendarController.createCalendar);

router
    .route('/calendars/:id')
    .patch(validate(calendarValidation.updateCalendar), calendarController.updateCalendar)
    .delete(validate(uuidParam('id')), calendarController.deleteCalendar);

router.get('/dashboard', adminController.getDashboardStats);
router.get('/venues/top-booked', adminController.getTopBookedVenues);
router.get('/analytics/revenue', adminController.getRevenueData);

module.exports = router;
