const express = require('express');
const { purchaseController } = require('../controllers/index.controller');
const {
    authenticate,
    enforceEmailVerification,
    checkPurchaseOwner,
} = require('../middlewares/index.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/me/purchases', purchaseController.listMyPurchases);

router
    .route('/purchases/:id')
    .get(checkPurchaseOwner, purchaseController.getPurchase);

router.post(
    '/purchases/:id/fulfill',
    enforceEmailVerification,
    checkPurchaseOwner,
    purchaseController.fulfillPurchase
);

router.get(
    '/purchases/:id/invoice',
    checkPurchaseOwner,
    purchaseController.getPurchaseInvoice
);

module.exports = router;