/**
 * Facility Manager Routes
 * Routes for venue management, maintenance scheduling, utilization reports, and event setup support
 * Accessible by ADMIN and FACILITY_MANAGER roles
 */

const express = require('express');
const { facilityManagerController } = require('../controllers/index.controller');
const { validate, authenticate, authorize } = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');
const { uuidParam, paginationQuery } = require('../validations/index.validation');
const Joi = require('joi');

const router = express.Router();

// All routes require authentication and facility manager authorization
router.use(authenticate);
router.use(authorize([ROLES.ADMIN, ROLES.FACILITY_MANAGER]));

// ==================== MAINTENANCE MANAGEMENT ====================

const maintenanceValidation = {
    createMaintenance: {
        body: Joi.object().keys({
            venueId: Joi.string().uuid().required(),
            title: Joi.string().required().max(255),
            description: Joi.string().optional(),
            type: Joi.string().valid(
                'ROUTINE',
                'REPAIR',
                'UPGRADE',
                'INSPECTION',
                'CLEANING',
                'EMERGENCY'
            ).default('ROUTINE'),
            scheduledAt: Joi.date().iso().required(),
            assignedTo: Joi.string().max(255),
            notes: Joi.string(),
            cost: Joi.number().precision(2),
        }),
    },
    updateMaintenanceStatus: {
        params: Joi.object().keys({
            id: Joi.string().uuid().required(),
        }),
        body: Joi.object().keys({
            status: Joi.string().valid(
                'SCHEDULED',
                'IN_PROGRESS',
                'COMPLETED',
                'CANCELLED'
            ).required(),
            notes: Joi.string(),
        }),
    },
    updateMaintenance: {
        params: Joi.object().keys({
            id: Joi.string().uuid().required(),
        }),
        body: Joi.object().keys({
            title: Joi.string().max(255),
            description: Joi.string(),
            type: Joi.string().valid(
                'ROUTINE',
                'REPAIR',
                'UPGRADE',
                'INSPECTION',
                'CLEANING',
                'EMERGENCY'
            ),
            scheduledAt: Joi.date().iso(),
            assignedTo: Joi.string().max(255),
            notes: Joi.string(),
            cost: Joi.number().precision(2),
        }),
    },
    listMaintenance: {
        query: Joi.object().keys({
            venueId: Joi.string().uuid(),
            status: Joi.string().valid('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
            type: Joi.string().valid('ROUTINE', 'REPAIR', 'UPGRADE', 'INSPECTION', 'CLEANING', 'EMERGENCY'),
            startDate: Joi.date().iso(),
            endDate: Joi.date().iso(),
            page: Joi.number().integer().min(1),
            pageSize: Joi.number().integer().min(1).max(100),
        }),
    },
};

router
    .route('/maintenance')
    .post(validate(maintenanceValidation.createMaintenance), facilityManagerController.createMaintenance)
    .get(validate(maintenanceValidation.listMaintenance), facilityManagerController.listMaintenanceSchedules);

router
    .route('/maintenance/:id')
    .patch(validate(maintenanceValidation.updateMaintenance), facilityManagerController.updateMaintenance)
    .delete(validate(uuidParam('id')), facilityManagerController.deleteMaintenance);

router.patch(
    '/maintenance/:id/status',
    validate(maintenanceValidation.updateMaintenanceStatus),
    facilityManagerController.updateMaintenanceStatus
);

router.get(
    '/venues/:venueId/maintenance/upcoming',
    validate({
        params: Joi.object().keys({
            venueId: Joi.string().uuid().required(),
        }),
    }),
    facilityManagerController.getUpcomingMaintenance
);

// ==================== VENUE AVAILABILITY ====================

const availabilityValidation = {
    getAvailability: {
        params: Joi.object().keys({
            venueId: Joi.string().uuid().required(),
        }),
        query: Joi.object().keys({
            startDate: Joi.date().iso().required(),
            endDate: Joi.date().iso().required(),
        }),
    },
    blockDate: {
        params: Joi.object().keys({
            venueId: Joi.string().uuid().required(),
        }),
        body: Joi.object().keys({
            date: Joi.date().iso().required(),
            reason: Joi.string().required(),
        }),
    },
};

router.get(
    '/venues/:venueId/availability',
    validate(availabilityValidation.getAvailability),
    facilityManagerController.getVenueAvailability
);

router.post(
    '/venues/:venueId/block',
    validate(availabilityValidation.blockDate),
    facilityManagerController.blockVenueDate
);

// ==================== UTILIZATION REPORTS ====================

const reportValidation = {
    utilizationReport: {
        query: Joi.object().keys({
            startDate: Joi.date().iso(),
            endDate: Joi.date().iso(),
            venueId: Joi.string().uuid(),
        }),
    },
};

router.get(
    '/reports/venue-utilization',
    validate(reportValidation.utilizationReport),
    facilityManagerController.getVenueUtilizationReport
);

router.get(
    '/reports/facility-usage-summary',
    validate(reportValidation.utilizationReport),
    facilityManagerController.getFacilityUsageSummary
);

// ==================== EVENT SETUP SUPPORT ====================

router.get(
    '/events/requiring-setup',
    validate({
        query: Joi.object().keys({
            days: Joi.number().integer().min(1).max(30).default(7),
        }),
    }),
    facilityManagerController.getEventsRequiringSetup
);

router.get(
    '/venues/:venueId/tools',
    validate({
        params: Joi.object().keys({
            venueId: Joi.string().uuid().required(),
        }),
    }),
    facilityManagerController.getVenueToolsAndEquipment
);

router.post(
    '/events/:eventId/setup-activity',
    validate({
        params: Joi.object().keys({
            eventId: Joi.string().uuid().required(),
        }),
        body: Joi.object().keys({
            activity: Joi.string().required(),
        }),
    }),
    facilityManagerController.logSetupActivity
);

// ==================== BOOKING PROCESSING ====================

router.get(
    '/bookings/pending',
    validate({
        query: Joi.object().keys({
            venueId: Joi.string().uuid(),
            page: Joi.number().integer().min(1),
            pageSize: Joi.number().integer().min(1).max(100),
        }),
    }),
    facilityManagerController.getPendingBookingRequests
);

router.post(
    '/bookings/:bookingId/process',
    validate({
        params: Joi.object().keys({
            bookingId: Joi.string().uuid().required(),
        }),
        body: Joi.object().keys({
            action: Joi.string().valid('APPROVE', 'REJECT').required(),
            notes: Joi.string(),
        }),
    }),
    facilityManagerController.processBookingAllocation
);

module.exports = router;
