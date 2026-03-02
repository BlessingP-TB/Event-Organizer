const express = require('express');
const { documentController } = require('../controllers/index.controller');
const { documentValidation } = require('../validations/index.validation');
const {
    validate,
    authenticate,
    enforceEmailVerification,
    checkDocumentOwnerOrAdmin,
} = require('../middlewares/index.middleware');

const router = express.Router();

router.use(authenticate);

router
    .route('/me/documents')
    .get(documentController.listMyDocuments)
    .post(
        enforceEmailVerification,
        // validate(documentValidation.uploadUserDocument),
        documentController.uploadUserDocument
    );

router
    .route('/documents/:id')
    .get(
        validate(documentValidation.documentIdParam),
        checkDocumentOwnerOrAdmin,
        documentController.getDocument
    )
    .delete(
        validate(documentValidation.documentIdParam),
        checkDocumentOwnerOrAdmin,
        documentController.deleteDocument
    );

module.exports = router;

