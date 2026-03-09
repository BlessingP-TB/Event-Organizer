const express = require('express');
const { ticketController } = require('../controllers/index.controller');
const { ticketValidation } = require('../validations/index.validation');
const {
    validate,
    authenticate,
    checkTicketOwner,
} = require('../middlewares/index.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/me/tickets', ticketController.listMyTickets);

router.get(
    '/tickets/:id',
    validate(ticketValidation.getTicket),
    checkTicketOwner,
    ticketController.getTicket
);

module.exports = router;