const express = require('express');
const { liquorRequestController } = require('../controllers/index.controller');
const { liquorRequestValidation } = require('../validations/index.validation');
const {
    validate,
    authenticate,
    authorize,
    enforceEmailVerification,
} = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();

router.use(authenticate, enforceEmailVerification);

router
    .route('/:id')
    .get(
        authorize([ROLES.ORGANIZER, ROLES.ADMIN]),
        validate(liquorRequestValidation.liquorRequestIdParam),
        liquorRequestController.getLiquorRequest
    )
    .patch(
        authorize(ROLES.ORGANIZER),
        validate(liquorRequestValidation.updateLiquorRequest),
        liquorRequestController.updateLiquorRequest
    );

module.exports = router;