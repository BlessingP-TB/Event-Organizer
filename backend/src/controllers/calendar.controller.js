const { calendarService } = require('../services/index.service');
const { asyncHandler } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const createCalendar = asyncHandler(async (req, res) => {
    const { //title, 
        date, startTime, endTime, venueIds } = req.body;
    const createdById = req.user.id;

    const calendar = await calendarService.createCalendar({
        // title,
        date,
        startTime,
        endTime,
        venueIds,
        createdById,
    });


    res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Calendar created successfully',
        data: calendar,
    });
});

/*const getAllCalendars = asyncHandler(async (req, res) => {
    const calendars = await calendarService.getCalendars();
    res.status(HTTP_STATUS.OK).json({
        success: true,
        data: calendars,
    });
});*/
const getAllCalendars = asyncHandler(async (req, res) => {
    const calendars = await calendarService.getCalendars();

    // Organizers only need these 4 fields — much faster on mobile
    const simplified = calendars.map(entry => ({
        date: entry.date.toISOString().split('T')[0], // "2025-11-18"
        startTime: entry.startTime,
        endTime: entry.endTime,
        venueIds: entry.venueIds || [],
    }));

    res.status(HTTP_STATUS.OK).json({
        success: true,
        data: simplified,
    });
});

const updateCalendar = asyncHandler(async (req, res) => {
    const calendarId = req.params.id;
    const { date, startTime, endTime, venueIds } = req.body; // <-- Updated fields

    const updatedCalendar = await calendarService.updateCalendar(calendarId, {
        date,
        startTime,
        endTime,
        venueIds,
    }); // <-- Updated fields passed to service

    res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Calendar updated successfully',
        data: updatedCalendar,
    });
});

const deleteCalendar = asyncHandler(async (req, res) => {
    await calendarService.deleteCalendar(req.params.id);
    res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Calendar deleted successfully',
    });
});

module.exports = {
    createCalendar,
    getAllCalendars,
    updateCalendar, // <-- added
    deleteCalendar,
};
