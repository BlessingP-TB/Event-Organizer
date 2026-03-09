const { ticketService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const issueTicket = catchAsync(async (req, res) => {
    const ticket = await ticketService.issueTicket(
        req.params.eventId,
        req.body
    );
    res.status(HTTP_STATUS.CREATED).send(ticket);
});

const listMyTickets = catchAsync(async (req, res) => {
    const tickets = await ticketService.listUserTickets(req.user.id);
    res.status(HTTP_STATUS.OK).send(tickets);
});

const listEventTickets = catchAsync(async (req, res) => {
    const tickets = await ticketService.listEventTickets(req.params.eventId);
    res.status(HTTP_STATUS.OK).send(tickets);
});

const getTicket = catchAsync(async (req, res) => {
    const ticket = await ticketService.getTicketById(req.params.id);
    res.status(HTTP_STATUS.OK).send(ticket);
});

const redeemTicket = catchAsync(async (req, res) => {
    const ticket = await ticketService.redeemTicket(req.params.ticketId);
    res.status(HTTP_STATUS.OK).send(ticket);
});

module.exports = {
    issueTicket,
    listMyTickets,
    listEventTickets,
    getTicket,
    redeemTicket,
};

