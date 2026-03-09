const express = require('express');
const { reportController } = require('../controllers/index.controller');
const { reportValidation } = require('../validations/index.validation');
const {
    validate,
    authenticate,
    authorize,
    checkEventOwner,
} = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();

router.use(authenticate, authorize([ROLES.ADMIN, ROLES.ORGANIZER]));

router
    .route('/events/:eventId/reports')
    .post(
        validate(reportValidation.createReport),
        //checkEventOwner,
        reportController.createReport
    )
    .get(
        validate(reportValidation.listReports),
        checkEventOwner,
        reportController.listReports
    );

router
    .route('/analytics')
    .get(
        authorize([ROLES.ADMIN]), // only admin can access
        reportController.getAnalyticsSummary
    );


router
    .route('/reports/:id')
    .get(
        validate(reportValidation.reportIdParam),
        reportController.getReport
    )
    .patch(
        validate(reportValidation.updateReport),
        reportController.updateReport
    )
    .delete(
        validate(reportValidation.reportIdParam),
        reportController.deleteReport
    );

module.exports = router;

