const express = require('express');
const { invoiceController } = require('../controllers/index.controller');
const { invoiceValidation } = require('../validations/index.validation');
const {
    validate,
    authenticate,
    authorize,
} = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();

router.use(authenticate);

router.get(
    '/invoices',
    authorize(ROLES.ADMIN),
    validate(invoiceValidation.listInvoices),
    invoiceController.listAllInvoices
);

router.get(
    '/me/invoices',
    validate(invoiceValidation.listInvoices),
    invoiceController.listMyInvoices
);

router
    .route('/invoices/:id')
    .get(
        validate(invoiceValidation.invoiceIdParam),
        invoiceController.getInvoice
    );

module.exports = router;