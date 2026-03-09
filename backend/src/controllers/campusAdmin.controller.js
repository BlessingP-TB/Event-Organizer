/**
 * Campus Admin Controller
 * Handles campus-wide event management, policy setting, analytics, and multi-campus coordination
 * For Department Heads and Campus Management roles
 */

const { campusAdminService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

// ==================== CAMPUS MANAGEMENT ====================

const createCampus = catchAsync(async (req, res) => {
    const campus = await campusAdminService.createCampus(req.body);
    res.status(HTTP_STATUS.CREATED).send(campus);
});

const listCampuses = catchAsync(async (req, res) => {
    const result = await campusAdminService.listCampuses(req.query);
    res.status(HTTP_STATUS.OK).send(result);
});

const updateCampus = catchAsync(async (req, res) => {
    const campus = await campusAdminService.updateCampus(req.params.id, req.body);
    res.status(HTTP_STATUS.OK).send(campus);
});

const assignAdminToCampus = catchAsync(async (req, res) => {
    const { userId, isPrimary } = req.body;
    const assignment = await campusAdminService.assignAdminToCampus(
        req.params.campusId,
        userId,
        isPrimary
    );
    res.status(HTTP_STATUS.OK).send(assignment);
});

const removeAdminFromCampus = catchAsync(async (req, res) => {
    await campusAdminService.removeAdminFromCampus(
        req.params.campusId,
        req.params.userId
    );
    res.status(HTTP_STATUS.NO_CONTENT).send();
});

const assignVenueToCampus = catchAsync(async (req, res) => {
    const { venueId } = req.body;
    const assignment = await campusAdminService.assignVenueToCampus(
        req.params.campusId,
        venueId
    );
    res.status(HTTP_STATUS.OK).send(assignment);
});

// ==================== POLICY MANAGEMENT ====================

const createPolicy = catchAsync(async (req, res) => {
    const policy = await campusAdminService.createPolicy(req.body, req.user.id);
    res.status(HTTP_STATUS.CREATED).send(policy);
});

const listPolicies = catchAsync(async (req, res) => {
    const result = await campusAdminService.listPolicies(req.query);
    res.status(HTTP_STATUS.OK).send(result);
});

const updatePolicy = catchAsync(async (req, res) => {
    const policy = await campusAdminService.updatePolicy(
        req.params.id,
        req.body,
        req.user.id
    );
    res.status(HTTP_STATUS.OK).send(policy);
});

const deletePolicy = catchAsync(async (req, res) => {
    await campusAdminService.deletePolicy(req.params.id);
    res.status(HTTP_STATUS.NO_CONTENT).send();
});

const getActivePoliciesByCategory = catchAsync(async (req, res) => {
    const policies = await campusAdminService.getActivePoliciesByCategory(
        req.params.category
    );
    res.status(HTTP_STATUS.OK).send(policies);
});

// ==================== STRATEGIC ANALYTICS ====================

const getEventEngagementAnalytics = catchAsync(async (req, res) => {
    const analytics = await campusAdminService.getEventEngagementAnalytics(req.query);
    res.status(HTTP_STATUS.OK).send(analytics);
});

const getEventSuccessMetrics = catchAsync(async (req, res) => {
    const metrics = await campusAdminService.getEventSuccessMetrics(req.query);
    res.status(HTTP_STATUS.OK).send(metrics);
});

const getResourceUtilization = catchAsync(async (req, res) => {
    const utilization = await campusAdminService.getResourceUtilization(req.query);
    res.status(HTTP_STATUS.OK).send(utilization);
});

// ==================== COMPLIANCE MONITORING ====================

const getComplianceOverview = catchAsync(async (req, res) => {
    const overview = await campusAdminService.getComplianceOverview();
    res.status(HTTP_STATUS.OK).send(overview);
});

const getEventsRequiringReview = catchAsync(async (req, res) => {
    const events = await campusAdminService.getEventsRequiringReview();
    res.status(HTTP_STATUS.OK).send(events);
});

module.exports = {
    // Campus Management
    createCampus,
    listCampuses,
    updateCampus,
    assignAdminToCampus,
    removeAdminFromCampus,
    assignVenueToCampus,
    
    // Policy Management
    createPolicy,
    listPolicies,
    updatePolicy,
    deletePolicy,
    getActivePoliciesByCategory,
    
    // Strategic Analytics
    getEventEngagementAnalytics,
    getEventSuccessMetrics,
    getResourceUtilization,
    
    // Compliance
    getComplianceOverview,
    getEventsRequiringReview,
};
