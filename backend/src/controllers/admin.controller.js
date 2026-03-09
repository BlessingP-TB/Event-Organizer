// src/controllers/admin.controller.js
const {
    adminService,
    organizerService,
    venueService,
    toolService,
    eventService,
    approvalService,
} = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');
const upload = require('../configs/multer.config'); // Import your multer middleware configuration
const path = require('path');
const fs = require('fs');

const listUsers = catchAsync(async (req, res) => {
    const paginatedResult = await adminService.listUsers(req.query);
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const getUser = catchAsync(async (req, res) => {
    const user = await adminService.getUserById(req.params.id);
    res.status(HTTP_STATUS.OK).send(user);
});

const updateUser = catchAsync(async (req, res) => {
    const user = await adminService.updateUser(req.params.id, req.body);
    res.status(HTTP_STATUS.OK).send(user);
});

const deleteUser = catchAsync(async (req, res) => {
    await adminService.deleteUser(req.params.id, req.user.id);
    res.status(HTTP_STATUS.NO_CONTENT).send();
});

const listOrganizerProfiles = catchAsync(async (req, res) => {
    const paginatedResult = await organizerService.listOrganizerProfiles(
        req.query
    );
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const verifyOrganizerProfile = catchAsync(async (req, res) => {
    const profile = await organizerService.verifyOrganizerProfile(
        req.params.profileId,
        req.body,
        req.user.id
    );
    res.status(HTTP_STATUS.OK).send(profile);
});

const createVenue = catchAsync(async (req, res) => {
    const venue = await venueService.createVenue(req.body);
    res.status(HTTP_STATUS.CREATED).send(venue);
});

const createVenueWithFiles = catchAsync(async (req, res) => {
    const { name, location, price, capacity, type, rateType, typeOther, depositValue } = req.body;

    console.log("Received body fields:", { name, location, price, capacity, type, rateType, typeOther, depositValue }); // Debug log
    console.log("Received req.files:", req.files); // Debug log - Check the structure here

    let imageUrls = [];
    // Check if req.files is an array and filter for files named 'imageFiles'
    if (Array.isArray(req.files)) {
        console.log("req.files is an array, length:", req.files.length); // Debug log
        const imageFiles = req.files.filter(file => file.fieldname === 'imageFiles');
        console.log("Filtered imageFiles:", imageFiles); // Debug log
        for (const file of imageFiles) {
            console.log("Processing file:", file.originalname, "Size:", file.size, "Mimetype:", file.mimetype); // Debug log
            try {
                const url = await uploadFileToStorage(file.buffer, file.originalname);
                console.log("Upload successful, URL:", url); // Debug log
                imageUrls.push(url);
            } catch (uploadError) {
                console.error("Error processing file:", file.originalname, "Error:", uploadError); // Debug log
                // Decide whether to continue processing other files or fail the whole request
                // For now, let's continue and log the error, but the request might fail later if all uploads fail
                // Or, re-throw to fail the whole request:
                // throw uploadError;
            }
        }
    } else {
        console.log("req.files is not an array:", typeof req.files); // Debug log
    }

    console.log("Final imageUrls array:", imageUrls); // Debug log

    const venueData = {
        name,
        location,
        price: parseFloat(price) || 0,
        capacity: parseInt(capacity) || 0,
        type,
        rateType,
        typeOther,
        depositValue: parseFloat(depositValue), // Handle potential NaN if depositValue is not a number string
        imageUrls, // Pass the array of URLs
    };

    console.log("Sending data to service:", venueData); // Debug log

    const newVenue = await venueService.createVenue(venueData);
    res.status(HTTP_STATUS.CREATED).send(newVenue);
});

const listAllVenues = catchAsync(async (req, res) => {
    const paginatedResult = await venueService.listAllVenues(req.query);
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const updateVenue = catchAsync(async (req, res) => {
    const venue = await venueService.updateVenue(req.params.id, req.body);
    res.status(HTTP_STATUS.OK).send(venue);
});

const updateVenueWithFiles = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, location, price, capacity, type, rateType, typeOther, depositValue } = req.body;

    console.log("Received body fields:", { name, location, price, capacity, type, rateType, typeOther, depositValue }); // Debug log
    console.log("Received req.files:", req.files); // Debug log

    let imageUrls = [];
    let newImagesUploaded = false; // Flag to track if new images were processed

    // Check if req.files is an array and filter for files named 'imageFiles'
    if (Array.isArray(req.files)) {
        console.log("req.files is an array, length:", req.files.length); // Debug log
        const imageFiles = req.files.filter(file => file.fieldname === 'imageFiles');
        console.log("Filtered imageFiles:", imageFiles); // Debug log
        for (const file of imageFiles) {
            console.log("Processing file:", file.originalname, "Size:", file.size, "Mimetype:", file.mimetype); // Debug log
            try {
                const url = await uploadFileToStorage(file.buffer, file.originalname);
                console.log("Upload successful, URL:", url); // Debug log
                imageUrls.push(url);
                newImagesUploaded = true; // Set flag if at least one new image is processed
            } catch (uploadError) {
                console.error("Error processing file:", file.originalname, "Error:", uploadError); // Debug log
                // Decide whether to continue processing other files or fail the whole request
                // For now, let's continue and log the error, but the request might fail later if all uploads fail
                // Or, re-throw to fail the whole request:
                // throw uploadError;
            }
        }
    } else {
        console.log("req.files is not an array:", typeof req.files); // Debug log
    }

    console.log("Final imageUrls array (from new uploads):", imageUrls); // Debug log
    console.log("New images uploaded flag:", newImagesUploaded); // Debug log

    const updateData = {
        name,
        location,
        price: parseFloat(price) || 0,
        capacity: parseInt(capacity) || 0,
        type,
        rateType,
        typeOther,
        depositValue: parseFloat(depositValue), // Handle potential NaN if depositValue is not a number string
    };

    // --- CRITICAL CHANGE ---
    // Always include imageUrls in updateData if *new* files were uploaded OR if *no* new files were uploaded
    // If new files were uploaded, use the array of new URLs.
    // If no new files were uploaded, explicitly set imageUrls to an empty array to clear existing ones.
    if (newImagesUploaded) {
        updateData.imageUrls = imageUrls; // Include new URLs if any were uploaded
    } else {
        updateData.imageUrls = []; // Explicitly set to empty array if no new images were uploaded
    }
    // --- END OF CRITICAL CHANGE ---

    console.log("Sending data to service:", updateData); // Debug log

    const updatedVenue = await venueService.updateVenue(id, updateData);
    res.status(HTTP_STATUS.OK).send(updatedVenue);
});

const deleteVenue = catchAsync(async (req, res) => {
    await venueService.deleteVenue(req.params.id);
    res.status(HTTP_STATUS.NO_CONTENT).send();
});

const createTool = catchAsync(async (req, res) => {
    const tool = await toolService.createTool(req.body);
    res.status(HTTP_STATUS.CREATED).send(tool);
});

const listAllTools = catchAsync(async (req, res) => {
    const paginatedResult = await toolService.listAllTools(req.query);
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const updateTool = catchAsync(async (req, res) => {
    const tool = await toolService.updateTool(req.params.id, req.body);
    res.status(HTTP_STATUS.OK).send(tool);
});

const deleteTool = catchAsync(async (req, res) => {
    await toolService.deleteTool(req.params.id);
    res.status(HTTP_STATUS.NO_CONTENT).send();
});

const updateVenueTools = catchAsync(async (req, res) => {
    const venue = await venueService.updateVenueTools(
        req.params.venueId,
        req.body
    );
    res.status(HTTP_STATUS.OK).send(venue);
});

const listAdminEvents = catchAsync(async (req, res) => {
    const paginatedResult = await eventService.listAdminEvents(req.query);
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const setEventStatus = catchAsync(async (req, res) => {
    const event = await eventService.setEventStatus(
        req.params.eventId,
        req.body.status,
        req.user.id
    );
    res.status(HTTP_STATUS.OK).send(event);
});

/*const setEventStatus = catchAsync(async (req, res) => {

    // -----------------------------------------------------------------
    // TEMPORARY FIX: Provide a dummy ID when authentication is bypassed
    // -----------------------------------------------------------------
    const adminId = req.user?.id || '8a02eef8-b800-4e77-bcfe-106776d83ab1';

    const event = await eventService.setEventStatus(
        req.params.eventId,
        req.body.status,
        adminId // Use the safely retrieved or dummy ID
    );
    res.status(HTTP_STATUS.OK).send(event);
});*/

const createEventApproval = catchAsync(async (req, res) => {
    const approval = await approvalService.createEventApproval(
        req.params.eventId,
        req.user.id,
        req.body
    );
    res.status(HTTP_STATUS.CREATED).send(approval);
});

/*const createEventApproval = catchAsync(async (req, res) => {
    const TEST_ADMIN_ID = '8a02eef8-b800-4e77-bcfe-106776d83ab1'; // <-- Use a valid Admin UUID

    const approval = await approvalService.createEventApproval(
        req.params.eventId,
        TEST_ADMIN_ID,
        req.body
    );
    res.status(HTTP_STATUS.CREATED).send(approval);
});
*/
const updateApproval = catchAsync(async (req, res) => {
    const approval = await approvalService.updateApprovalStatus(
        req.params.id,
        req.user.id,
        req.body
    );
    res.status(HTTP_STATUS.OK).send(approval);
});
// In approval.controller.js (or where updateApproval is defined)

/*const updateApproval = catchAsync(async (req, res) => {

    // -----------------------------------------------------------------
    // TEMPORARY FIX: Provide a dummy ID when authentication is bypassed
    // -----------------------------------------------------------------
    // Assuming the user ID is needed in the updateApprovalStatus service call
    const adminId = req.user?.id || 'd5b376ad-13ef-4b59-abaa-f601083f83c6';

    const approval = await approvalService.updateApprovalStatus(
        req.params.id, // Assuming the route is /:id, NOT /:approval_id (Based on prior fix recommendation)
        adminId,      // Pass the Admin ID to the service
        req.body
    );
    res.status(HTTP_STATUS.OK).send(approval);
});
*/
/*const approveImmediateBooking = catchAsync(async (req, res) => {

    const event = await approvalService.approveImmediateBooking(
        req.params.eventId,
        req.user.id,
        req.body.reason
    );
    res.status(HTTP_STATUS.OK).send(event);
});*/
const approveImmediateBooking = catchAsync(async (req, res) => {
    const adminId = req.user?.id || '8a02eef8-b800-4e77-bcfe-106776d83ab1';
    const event = await approvalService.approveImmediateBooking(
        req.params.eventId,
        adminId,
        req.body.reason
    );
    res.status(HTTP_STATUS.OK).send(event);
});

const getDashboardStats = catchAsync(async (req, res) => {
    const dashboardStats = await adminService.getDashboardStats();
    res.status(HTTP_STATUS.OK).json(dashboardStats); // ✅ flat object
});

const getTopBookedVenues = catchAsync(async (req, res) => {
    const topVenues = await adminService.getTopBookedVenues();
    
    res.status(HTTP_STATUS.OK).json(topVenues);
});

const getRevenueData = catchAsync(async (req, res) => {
    const revenueData = await adminService.getRevenueData();
  
    res.status(HTTP_STATUS.OK).json(revenueData);
});

const getEvent = catchAsync(async (req, res) => {
    const event = await eventService.getEventById(req.params.eventId);
    res.status(HTTP_STATUS.OK).send(event);
});



// IMPLEMENTATION for local storage
const uploadFileToStorage = async (fileBuffer, originalName) => {
    const { ApiError } = require('../utils/index.util');
    const uploadDir = path.join(__dirname, '../uploads/venues'); // Define your upload directory

    console.log("Attempting to save file:", originalName, "to directory:", uploadDir); // Debug log

    try {
        // Ensure the upload directory exists
        await fs.promises.mkdir(uploadDir, { recursive: true });
        console.log("Upload directory ensured:", uploadDir); // Debug log

        // Generate a unique filename (e.g., using timestamp + original name)
        const uniqueFilename = `${Date.now()}-${originalName}`;
        const filePath = path.join(uploadDir, uniqueFilename);

        console.log("Full file path:", filePath); // Debug log

        // Write the file buffer to the specified path
        await fs.promises.writeFile(filePath, fileBuffer);
        console.log("File written successfully to:", filePath); // Debug log

        // --- GENERATE FULL URL FOR WEB ---
        // Get the API server's base URL from environment variable or default to localhost:3000
        const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000'; // Adjust if your server runs on a different host/port
        // Return the full URL path (adjust base URL as needed for your deployment)
        // This assumes your server serves static files from the 'uploads' directory
        const url = `${apiBaseUrl}/uploads/venues/${uniqueFilename}`;
        // --- END OF FULL URL GENERATION ---
        
        console.log("Generated Full URL:", url); // Debug log
        return url;
    } catch (error) {
        console.error("Local file upload error in uploadFileToStorage:", error); // Debug log
        throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, `Failed to save image locally: ${error.message}`);
    }
};



// IMPLEMENTATION for local storage



module.exports = {
    listUsers,
    getUser,
    updateUser,
    deleteUser,
    listOrganizerProfiles,
    verifyOrganizerProfile,
    createVenue,
    createVenueWithFiles, // Export the new function
    listAllVenues,
    updateVenue,
    updateVenueWithFiles, // Export the new function
    deleteVenue,
    createTool,
    listAllTools,
    updateTool,
    deleteTool,
    updateVenueTools,
    listAdminEvents,
    setEventStatus,
    createEventApproval,
    updateApproval,
    approveImmediateBooking,
    getDashboardStats,
    getTopBookedVenues,
    getRevenueData,
};
