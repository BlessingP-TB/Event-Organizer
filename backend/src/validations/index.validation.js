const approvalValidation = require('./approval.validation');
const attendanceValidation = require('./attendance.validation');
const authValidation = require('./auth.validation');
const adminValidation = require('./admin.validation');
const bookingValidation = require('./booking.validation');
const documentValidation = require('./document.validation');
const eventValidation = require('./event.validation');
const invoiceValidation = require('./invoice.validation');
const liquorRequestValidation = require('./liquorRequest.validation');
const organizerValidation = require('./organizer.validation');
const purchaseValidation = require('./purchase.validation');
const registrationValidation = require('./registration.validation');
const reportValidation = require('./report.validation');
const systemSettingValidation = require('./systemSetting.validations');
const themeValidation = require('./theme.validation');
const ticketValidation = require('./ticket.validation');
const ticketDefinitionValidation = require('./ticketDefinition.validation');
const toolValidation = require('./tool.validation');
const userValidation = require('./user.validation');
const venueValidation = require('./venue.validation');
const venueIssuerValidation = require('./venueIssuer.validation');
const calendarValidation = require('./calendar.validation');
const {
    customJoi,
    uuidParam,
    basePaginationQuery,
    paginationQuery,
} = require('./custom.validation');

module.exports = {
    approvalValidation,
    attendanceValidation,
    authValidation,
    adminValidation,
    bookingValidation,
    documentValidation,
    eventValidation,
    invoiceValidation,
    liquorRequestValidation,
    organizerValidation,
    purchaseValidation,
    registrationValidation,
    reportValidation,
    systemSettingValidation,
    themeValidation,
    ticketValidation,
    ticketDefinitionValidation,
    toolValidation,
    userValidation,
    venueValidation,
    venueIssuerValidation,
    customJoi,
    uuidParam,
    basePaginationQuery,
    paginationQuery,
    calendarValidation,
};