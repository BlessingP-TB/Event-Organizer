const { customJoi, uuidParam } = require('./custom.validation');
const { DOC_TYPE, DOC_STATUS } = require('../constants/index.constants');

const documentIdParam = uuidParam('id');

const updateDocumentStatus = documentIdParam.keys({
    body: customJoi.object({
        status: customJoi
            .string()
            .valid(...Object.values(DOC_STATUS))
            .required(),
    }),
});

const baseUploadBody = {
    filename: customJoi.string().required(),
    size: customJoi.number().integer().min(1).required(),
    content: customJoi.string().base64().required(),
    mimetype: customJoi.string().required(),
};

const uploadUserDocument = customJoi.object({
    body: customJoi.object({
        ...baseUploadBody,
        type: customJoi
            .string()
            .valid(DOC_TYPE.ID, DOC_TYPE.PROOF_OF_EMPLOYMENT, DOC_TYPE.OTHER)
            .required(),
    }),
});

const uploadOrganizerDocument = customJoi.object({
    body: customJoi.object({
        ...baseUploadBody,
        type: customJoi
            .string()
            .valid(DOC_TYPE.ORGANIZER_CERT, DOC_TYPE.OTHER)
            .required(),
    }),
});

module.exports = {
    documentIdParam,
    updateDocumentStatus,
    uploadUserDocument,
    uploadOrganizerDocument,
};