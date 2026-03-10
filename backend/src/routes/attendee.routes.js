const express = require('express');
const { getMyAttendeeStats } = require('../controllers/stats.controller');
const {
    authenticate,
    authorize,
} = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();

router.use(authenticate, authorize(ROLES.ATTENDEE));

router.get('/stats', getMyAttendeeStats);

module.exports = router;