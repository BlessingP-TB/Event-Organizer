const express = require('express');
const { approvalController } = require('../controllers/index.controller');
const { approvalValidation } = require('../validations/index.validation');
const {
    validate,
    authenticate,
    authorize,
} = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();
//chaneg 1
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', approvalController.listApprovals);

router
    .route('/:id')
    .get(
        validate(approvalValidation.approvalIdParam),
        approvalController.getApproval
    )
    .patch(
        validate(approvalValidation.updateApproval),
        approvalController.updateApproval
    );

module.exports = router;
