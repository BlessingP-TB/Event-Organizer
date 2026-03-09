const { bookingService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const getBooking = catchAsync(async (req, res) => {
    const booking = await bookingService.getBookingById(req.params.id, req.user);
    res.status(HTTP_STATUS.OK).send(booking);
});

const listMyBookings = catchAsync(async (req, res) => {
    const paginatedResult = await bookingService.listUserBookings(
        req.user.id,
        req.query
    );
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const updateBookingDetails = catchAsync(async (req, res) => {
    // This function is intended for admins, so req.user should be an admin
    // The bookingId is passed as a route parameter
    // The fields to update (status, depositPaid, totalPaid) are passed in the request body
    const { id: bookingId } = req.params;
    const { status, depositPaid, totalPaid } = req.body;

    // Validate fields if needed (e.g., check types, status enum values)
    // const { customJoi, bookingValidation } = require('../validations'); // Import if needed
    // customJoi.validate({ status, depositPaid, totalPaid }, bookingValidation.updateBookingDetails);

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (depositPaid !== undefined) updateData.depositPaid = depositPaid;
    if (totalPaid !== undefined) updateData.totalPaid = totalPaid;

    if (Object.keys(updateData).length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).send({ error: "No fields to update provided." });
    }

    const updatedBooking = await bookingService.updateBookingDetails(bookingId, updateData);
    res.status(HTTP_STATUS.OK).send(updatedBooking);
});

const listAllBookings = catchAsync(async (req, res) => {
    const paginatedResult = await bookingService.listAllBookings(req.query);
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const payBookingInvoice = catchAsync(async (req, res) => {
    const result = await bookingService.payBookingInvoice(
        req.params.id,
        req.body.reference,
        req.user
    );
    res.status(HTTP_STATUS.OK).send(result);
});

const cancelBooking = catchAsync(async (req, res) => {
    const booking = await bookingService.cancelBooking(req.params.id, req.user);
    res.status(HTTP_STATUS.OK).send(booking);
});

module.exports = {
    getBooking,
    listMyBookings,
    listAllBookings,
    payBookingInvoice,
    cancelBooking,
    updateBookingDetails
};