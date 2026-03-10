/**
 * Facility Manager Controller
 * Handles venue management, maintenance scheduling, utilization reports, and event setup support
 * For Campus Facility Managers role
 */

const { facilityManagerService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

// ==================== MAINTENANCE MANAGEMENT ====================

const createMaintenance = catchAsync(async (req, res) => {
    const maintenance = await facilityManagerService.createMaintenance(
        req.body,
        req.user.id
    );
    res.status(HTTP_STATUS.CREATED).send(maintenance);
});

const listMaintenanceSchedules = catchAsync(async (req, res) => {
    const result = await facilityManagerService.listMaintenanceSchedules(req.query);
    res.status(HTTP_STATUS.OK).send(result);
});

const updateMaintenanceStatus = catchAsync(async (req, res) => {
    const { status, notes } = req.body;
    const maintenance = await facilityManagerService.updateMaintenanceStatus(
        req.params.id,
        status,
        notes
    );
    res.status(HTTP_STATUS.OK).send(maintenance);
});

const updateMaintenance = catchAsync(async (req, res) => {
    const maintenance = await facilityManagerService.updateMaintenance(
        req.params.id,
        req.body
    );
    res.status(HTTP_STATUS.OK).send(maintenance);
});

const deleteMaintenance = catchAsync(async (req, res) => {
    await facilityManagerService.deleteMaintenance(req.params.id);
    res.status(HTTP_STATUS.NO_CONTENT).send();
});

const getUpcomingMaintenance = catchAsync(async (req, res) => {
    const maintenance = await facilityManagerService.getUpcomingMaintenance(
        req.params.venueId
    );
    res.status(HTTP_STATUS.OK).send(maintenance);
});

// ==================== VENUE AVAILABILITY ====================

const getVenueAvailability = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    const availability = await facilityManagerService.getVenueAvailability(
        req.params.venueId,
        startDate,
        endDate
    );
    res.status(HTTP_STATUS.OK).send(availability);
});

const blockVenueDate = catchAsync(async (req, res) => {
    const { date, reason } = req.body;
    const result = await facilityManagerService.blockVenueDate(
        req.params.venueId,
        date,
        reason,
        req.user.id
    );
    res.status(HTTP_STATUS.CREATED).send(result);
});

// ==================== UTILIZATION REPORTS ====================

const getVenueUtilizationReport = catchAsync(async (req, res) => {
    const report = await facilityManagerService.getVenueUtilizationReport(req.query);
    res.status(HTTP_STATUS.OK).send(report);
});

const getFacilityUsageSummary = catchAsync(async (req, res) => {
    const summary = await facilityManagerService.getFacilityUsageSummary(req.query);
    res.status(HTTP_STATUS.OK).send(summary);
});

// ==================== EVENT SETUP SUPPORT ====================

const getEventsRequiringSetup = catchAsync(async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days) : 7;
    const events = await facilityManagerService.getEventsRequiringSetup(days);
    res.status(HTTP_STATUS.OK).send(events);
});

const getVenueToolsAndEquipment = catchAsync(async (req, res) => {
    const tools = await facilityManagerService.getVenueToolsAndEquipment(
        req.params.venueId
    );
    res.status(HTTP_STATUS.OK).send(tools);
});

const logSetupActivity = catchAsync(async (req, res) => {
    const { activity } = req.body;
    const log = await facilityManagerService.logSetupActivity(
        req.params.eventId,
        activity,
        req.user.id
    );
    res.status(HTTP_STATUS.CREATED).send(log);
});

// ==================== BOOKING PROCESSING ====================

const getPendingBookingRequests = catchAsync(async (req, res) => {
    const result = await facilityManagerService.getPendingBookingRequests(req.query);
    res.status(HTTP_STATUS.OK).send(result);
});

const processBookingAllocation = catchAsync(async (req, res) => {
    const { action, notes } = req.body;
    const booking = await facilityManagerService.processBookingAllocation(
        req.params.bookingId,
        action,
        notes
    );
    res.status(HTTP_STATUS.OK).send(booking);
});

module.exports = {
    // Maintenance Management
    createMaintenance,
    listMaintenanceSchedules,
    updateMaintenanceStatus,
    updateMaintenance,
    deleteMaintenance,
    getUpcomingMaintenance,
    
    // Venue Availability
    getVenueAvailability,
    blockVenueDate,
    
    // Utilization Reports
    getVenueUtilizationReport,
    getFacilityUsageSummary,
    
    // Event Setup Support
    getEventsRequiringSetup,
    getVenueToolsAndEquipment,
    logSetupActivity,
    
    // Booking Processing
    getPendingBookingRequests,
    processBookingAllocation,
};
