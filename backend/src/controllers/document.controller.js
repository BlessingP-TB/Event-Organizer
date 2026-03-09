const {
    documentService,
    organizerService,
} = require('../services/index.service');
const { catchAsync, ApiError } = require('../utils/index.util');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/index.constants');

const listMyDocuments = catchAsync(async (req, res) => {
    const documents = await documentService.listUserDocuments(req.user.id);
    res.status(HTTP_STATUS.OK).send(documents);
});

const uploadUserDocument = catchAsync(async (req, res) => {
    const document = await documentService.createDocument(req.user.id, req.body);
    res.status(HTTP_STATUS.CREATED).send(document);
});

const uploadOrganizerDocument = catchAsync(async (req, res) => {
    const organizerProfile = await organizerService.getOrganizerProfile(
        req.user.id
    );
    if (!organizerProfile) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.PROFILE_NOT_FOUND);
    }
    const docBody = {
        ...req.body,
        organizerProfileId: organizerProfile.id,
    };
    const document = await documentService.createDocument(req.user.id, docBody);
    res.status(HTTP_STATUS.CREATED).send(document);
});

const listDocumentsByUserId = catchAsync(async (req, res) => {
    // This function is intended for admins, so req.user should be an admin
    // The userId is passed as a route parameter
    const { userId } = req.params; // e.g., from route /admin/users/:userId/documents

    // Validate userId if needed (e.g., check if it's a valid UUID)
    // const { customJoi } = require('../validations/custom.validation'); // Import if needed
    // customJoi.validate({ userId }, customJoi.object({ userId: customJoi.string().required() }));

    const documents = await documentService.listDocumentsByUserId(userId);
    res.status(HTTP_STATUS.OK).send(documents);
});

const getDocument = catchAsync(async (req, res) => {
    const { document } = req;

    if (document.url) {
        return res.redirect(302, document.url);
    }

    if (document.content) {
        if (document.mimetype) {
            res.setHeader('Content-Type', document.mimetype);
        }
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${document.filename}"`
        );
        return res.send(document.content);
    }

    throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        'Document has no URL or content.'
    );
});

const updateDocumentStatus = catchAsync(async (req, res) => {
    const document = await documentService.updateDocumentStatus(
        req.params.id,
        req.body.status,
        req.user.id
    );
    res.status(HTTP_STATUS.OK).send(document);
});

const deleteDocument = catchAsync(async (req, res) => {
    await documentService.deleteDocument(req.params.id);
    res.status(HTTP_STATUS.NO_CONTENT).send();
});

module.exports = {
    listMyDocuments,
    uploadUserDocument,
    uploadOrganizerDocument,
    getDocument,
    updateDocumentStatus,
    deleteDocument,
    listDocumentsByUserId
};