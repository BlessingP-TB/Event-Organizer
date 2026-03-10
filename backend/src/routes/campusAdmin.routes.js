/**
 * Campus Admin Routes
 * Routes for campus-wide event management, policy setting, analytics, and multi-campus coordination
 * Accessible by ADMIN and CAMPUS_ADMIN roles
 */

const express = require('express');
const { campusAdminController } = require('../controllers/index.controller');
const { validate, authenticate, authorize } = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');
const { uuidParam, paginationQuery } = require('../validations/index.validation');
const Joi = require('joi');

const router = express.Router();

// All routes require authentication and admin-level authorization
router.use(authenticate);
router.use(authorize([ROLES.ADMIN, ROLES.CAMPUS_ADMIN]));

// ==================== CAMPUS MANAGEMENT ====================

const campusValidation = {
    createCampus: {
        body: Joi.object().keys({
            name: Joi.string().required().max(255),
            code: Joi.string().required().max(20),
            address: Joi.string().optional(),
            description: Joi.string().optional(),
        }),
    },
    updateCampus: {
        params: Joi.object().keys({
            id: Joi.string().uuid().required(),
        }),
        body: Joi.object().keys({
            name: Joi.string().max(255),
            code: Joi.string().max(20),
            address: Joi.string(),
            description: Joi.string(),
            isActive: Joi.boolean(),
        }),
    },
    assignAdmin: {
        params: Joi.object().keys({
            campusId: Joi.string().uuid().required(),
        }),
        body: Joi.object().keys({
            userId: Joi.string().uuid().required(),
            isPrimary: Joi.boolean().default(false),
        }),
    },
    assignVenue: {
        params: Joi.object().keys({
            campusId: Joi.string().uuid().required(),
        }),
        body: Joi.object().keys({
            venueId: Joi.string().uuid().required(),
        }),
    },
};

router
    .route('/campuses')
    .post(validate(campusValidation.createCampus), campusAdminController.createCampus)
    .get(validate(paginationQuery), campusAdminController.listCampuses);

router
    .route('/campuses/:id')
    .patch(validate(campusValidation.updateCampus), campusAdminController.updateCampus);

router.post(
    '/campuses/:campusId/admins',
    validate(campusValidation.assignAdmin),
    campusAdminController.assignAdminToCampus
);

router.delete(
    '/campuses/:campusId/admins/:userId',
    validate({
        params: Joi.object().keys({
            campusId: Joi.string().uuid().required(),
            userId: Joi.string().uuid().required(),
        }),
    }),
    campusAdminController.removeAdminFromCampus
);

router.post(
    '/campuses/:campusId/venues',
    validate(campusValidation.assignVenue),
    campusAdminController.assignVenueToCampus
);

// ==================== POLICY MANAGEMENT ====================

const policyValidation = {
    createPolicy: {
        body: Joi.object().keys({
            name: Joi.string().required().max(255),
            category: Joi.string().valid(
                'EVENT_APPROVAL',
                'VENUE_BOOKING',
                'SAFETY_COMPLIANCE',
                'LIQUOR_POLICY',
                'NOISE_POLICY',
                'CAPACITY_POLICY',
                'GENERAL'
            ).required(),
            description: Joi.string().required(),
            content: Joi.string().required(),
            effectiveFrom: Joi.date().iso(),
            effectiveUntil: Joi.date().iso(),
        }),
    },
    updatePolicy: {
        params: Joi.object().keys({
            id: Joi.string().uuid().required(),
        }),
        body: Joi.object().keys({
            name: Joi.string().max(255),
            category: Joi.string().valid(
                'EVENT_APPROVAL',
                'VENUE_BOOKING',
                'SAFETY_COMPLIANCE',
                'LIQUOR_POLICY',
                'NOISE_POLICY',
                'CAPACITY_POLICY',
                'GENERAL'
            ),
            description: Joi.string(),
            content: Joi.string(),
            isActive: Joi.boolean(),
            effectiveFrom: Joi.date().iso(),
            effectiveUntil: Joi.date().iso(),
        }),
    },
};

router
    .route('/policies')
    .post(validate(policyValidation.createPolicy), campusAdminController.createPolicy)
    .get(validate(paginationQuery), campusAdminController.listPolicies);

router
    .route('/policies/:id')
    .patch(validate(policyValidation.updatePolicy), campusAdminController.updatePolicy)
    .delete(validate(uuidParam('id')), campusAdminController.deletePolicy);

router.get(
    '/policies/category/:category',
    validate({
        params: Joi.object().keys({
            category: Joi.string().valid(
                'EVENT_APPROVAL',
                'VENUE_BOOKING',
                'SAFETY_COMPLIANCE',
                'LIQUOR_POLICY',
                'NOISE_POLICY',
                'CAPACITY_POLICY',
                'GENERAL'
            ).required(),
        }),
    }),
    campusAdminController.getActivePoliciesByCategory
);

// ==================== STRATEGIC ANALYTICS ====================

const analyticsValidation = {
    dateRange: {
        query: Joi.object().keys({
            startDate: Joi.date().iso(),
            endDate: Joi.date().iso(),
            campusId: Joi.string().uuid(),
            page: Joi.number().integer().min(1),
            pageSize: Joi.number().integer().min(1).max(100),
        }),
    },
};

router.get(
    '/analytics/engagement',
    validate(analyticsValidation.dateRange),
    campusAdminController.getEventEngagementAnalytics
);

router.get(
    '/analytics/success-metrics',
    validate(analyticsValidation.dateRange),
    campusAdminController.getEventSuccessMetrics
);

router.get(
    '/analytics/resource-utilization',
    validate(analyticsValidation.dateRange),
    campusAdminController.getResourceUtilization
);

// ==================== COMPLIANCE MONITORING ====================

router.get('/compliance/overview', campusAdminController.getComplianceOverview);
router.get('/compliance/events-requiring-review', campusAdminController.getEventsRequiringReview);

module.exports = router;
