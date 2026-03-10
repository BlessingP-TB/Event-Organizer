const express = require('express');
const { supportController } = require('../controllers/index.controller');
const { supportValidation } = require('../validations/index.validation');
const { validate, authenticate, authorize } = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();

router.use(authenticate, authorize(ROLES.ATTENDEE));

router.post('/requests', validate(supportValidation.createSupportRequest), supportController.createSupportRequest);

module.exports = router;
