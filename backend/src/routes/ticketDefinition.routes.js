const express = require('express');
const {
    ticketDefinitionController,
} = require('../controllers/index.controller');
const {
    ticketDefinitionValidation,
} = require('../validations/index.validation');
const {
    validate,
    authenticate,
    authorize,
    enforceEmailVerification,
} = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();

router.use(
    authenticate,
    authorize(ROLES.ORGANIZER),
    enforceEmailVerification
);

router.post(
    '/events/:eventId/ticket-definitions',
    validate(ticketDefinitionValidation.addTicketDefinition),
    ticketDefinitionController.addTicketDefinition
);

router
    .route('/ticket-definitions/:defId')
    .patch(
        validate(ticketDefinitionValidation.updateTicketDefinition),
        ticketDefinitionController.updateTicketDefinition
    )
    .delete(
        validate(ticketDefinitionValidation.deleteTicketDefinition),
        ticketDefinitionController.deleteTicketDefinition
    );

module.exports = router;