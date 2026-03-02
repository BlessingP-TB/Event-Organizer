const {
    customJoi,
    uuidParam,
    basePaginationQuery,
} = require('./custom.validation');

const bookingIdParam = uuidParam('id');
const listBookings = customJoi.object({
    query: basePaginationQuery,
});

const payBooking = bookingIdParam.keys({
    body: customJoi.object({
        reference: customJoi.string().required(),
    }),
});

module.exports = {
    bookingIdParam,
    listBookings,
    payBooking,
};