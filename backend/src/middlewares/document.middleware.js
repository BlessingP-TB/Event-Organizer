const { documentService } = require('../services/index.service');
const { ApiError, asyncHandler } = require('../utils/index.util');
const { HTTP_STATUS, ERROR_MESSAGES, ROLES } = require('../constants/index.constants');

const checkDocumentOwnerOrAdmin = asyncHandler(async (req, res, next) => {
    const document = await documentService.getDocumentById(req.params.id);

    if (
        document.userId !== req.user.id &&
        req.user.role !== ROLES.ADMIN
    ) {
        return next(
            new ApiError(
                HTTP_STATUS.FORBIDDEN,
                ERROR_MESSAGES.FORBIDDEN,
                'DOCUMENT_ACCESS_DENIED'
            )
        );
    }

    req.document = document;
    next();
});

module.exports = {
    checkDocumentOwnerOrAdmin,
};
