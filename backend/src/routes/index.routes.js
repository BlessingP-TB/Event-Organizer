const express = require('express');
const { env } = require('../configs/index.config');

const adminRoutes = require('./admin.routes');
const authRoutes = require('./auth.routes');
const eventRoutes = require('./event.routes');
const userRoutes = require('./user.routes');
const registrationRoutes = require('./registration.routes');
const liquorRequestRoutes = require('./liquorRequest.routes');
const reportRoutes = require('./report.routes');
const bookingRoutes = require('./booking.routes');
const invoiceRoutes = require('./invoice.routes');
const ticketDefinitionRoutes = require('./ticketDefinition.routes');
const approvalRoutes = require('./approval.routes');
const documentRoutes = require('./document.routes');
const organizerRoutes = require('./organizer.routes');
const purchaseRoutes = require('./purchase.routes');
const themeRoutes = require('./theme.routes');
const ticketRoutes = require('./ticket.routes');
const toolRoutes = require('./tool.routes');
const venueRoutes = require('./venue.routes');
const publicRoutes = require('./public.routes');

const router = express.Router();

const appRoutes = [
    { path: '/admin', route: adminRoutes },
    { path: '/auth', route: authRoutes },
    { path: '/events', route: eventRoutes },
    { path: '/users', route: userRoutes },
    { path: '/registrations', route: registrationRoutes },
    { path: '/liquor-requests', route: liquorRequestRoutes },
    { path: '/reports', route: reportRoutes },
    { path: '/bookings', route: bookingRoutes },
    { path: '/invoices', route: invoiceRoutes },
    { path: '/ticket-definitions', route: ticketDefinitionRoutes },
    { path: '/approvals', route: approvalRoutes },
    { path: '/documents', route: documentRoutes },
    { path: '/organizer', route: organizerRoutes },
    { path: '/purchases', route: purchaseRoutes },
    { path: '/themes', route: themeRoutes },
    { path: '/tickets', route: ticketRoutes },
    { path: '/tools', route: toolRoutes },
    { path: '/venues', route: venueRoutes },
    { path: '/', route: publicRoutes },
];

const apiRouter = express.Router();
appRoutes.forEach((route) => {
    apiRouter.use(route.path, route.route);
});

apiRouter.get('/', (req, res) => {
    res.status(200).send({ status: 'ok', message: 'BackendS2 API is running.' });
});

router.use(env.api.prefix, apiRouter);

module.exports = router;