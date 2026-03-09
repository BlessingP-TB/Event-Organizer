const { prisma, ApiError, logger } = require('../utils/index.util');
const { HTTP_STATUS, DOC_STATUS } = require('../constants/index.constants');
const { storage } = require('../configs/environment.config');
const { app } = require('../configs/index.config');
const { blobUtil } = require('../utils/blob.util');

const createDocument = async (userId, docBody) => {
    const { type, content, filename, size, mimetype, eventId, purchaseId, organizerProfileId } = docBody;
    if (!app.uploads.enabled) {
        throw new ApiError(HTTP_STATUS.NOT_IMPLEMENTED, 'File uploads are not enabled.');
    }
    if (!content) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'File content (base64) is required.');
    }
    if (!filename) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Filename is required.');
    }
    if (!size) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'File size is required.');
    }
    if (!mimetype) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Mimetype is required.');
    }
    if (size > app.uploads.maxFileSize) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, `File size exceeds limit of ${app.uploads.maxFileSize} bytes.`);
    }
    const buffer = Buffer.from(content, 'base64');
    let fileUrl = null;
    let fileContent = null;
    if (storage.strategy === 'BLOB') {
        try {
            const { url } = await blobUtil.uploadBuffer(buffer, filename, mimetype);
            fileUrl = url;
        } catch (error) {
            logger.error('Failed to upload document to blob storage', error);
            throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to store document.');
        }
    } else if (storage.strategy === 'DB') {
        fileContent = buffer;
    } else {
        throw new ApiError(HTTP_STATUS.NOT_IMPLEMENTED, 'Invalid or unsupported storage strategy.');
    }
    const data = {
        userId,
        type,
        filename,
        mimetype,
        url: fileUrl,
        content: fileContent,
        size,
        status: DOC_STATUS.PENDING,
        eventId,
        purchaseId,
        organizerProfileId
    };
    return prisma.document.create({
        data,
        select: {
            id: true,
            type: true,
            filename: true,
            size: true,
            status: true,
            submittedAt: true,
            url: true
        }
    });
};



const listUserDocuments = async (userId) => {
    return prisma.document.findMany({
        where: { userId, deletedAt: null },
        orderBy: { submittedAt: 'desc' },
        select: {
            id: true,
            type: true,
            filename: true,
            size: true,
            status: true,
            submittedAt: true,
            reviewedAt: true,
            url: true,
            eventId: true
        }
    });
};

const listDocumentsByUserId = async (userId) => {
    // Reuse the same logic as listUserDocuments, but allow any ID to be passed
    // This function should be called only by admin code with proper checks
    return prisma.document.findMany({
        where: { userId, deletedAt: null },
        orderBy: { submittedAt: 'desc' },
        select: {
            id: true,
            type: true,
            filename: true,
            size: true,
            status: true,
            submittedAt: true,
            reviewedAt: true,
            url: true,
            eventId : true,
            purchaseId: true
        }
    });
};

const getDocumentById = async (docId) => {
    const doc = await prisma.document.findFirst({
        where: { id: docId, deletedAt: null }
    });
    if (!doc) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Document not found.');
    }
    return doc;
};

const updateDocumentStatus = async (docId, status, reviewedByAdminId) => {
    try {
        return await prisma.document.update({
            where: { id: docId },
            data: {
                status,
                reviewedBy: reviewedByAdminId,
                reviewedAt: new Date()
            }
        });
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Document not found.');
        }
        throw error;
    }
};

const deleteDocument = async (docId) => {
    try {
        await prisma.document.update({
            where: { id: docId },
            data: { deletedAt: new Date() }
        });
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Document not found.');
        }
        throw error;
    }
};

module.exports = {
    createDocument,
    listUserDocuments,
    getDocumentById,
    updateDocumentStatus,
    deleteDocument,
    listDocumentsByUserId
};
