const express = require('express');
const { authenticate } = require('../middlewares/index.middleware');

const router = express.Router();

// Stub endpoint - returns empty notifications array
router.get('/', authenticate, (req, res) => {
    const userId = req.query.userId;
    // Return empty array for now - implement full notification system later
    res.status(200).json([]);
});

module.exports = router;
