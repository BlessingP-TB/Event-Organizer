const express = require('express');

const { toolController } = require('../controllers/index.controller');



const router = express.Router();



// Public route — list all tools

router.get('/public', toolController.listPublicTools);



// Admin route — list all tools (for admin access, e.g., with auth middleware)

router.get('/', toolController.listAllTools);



// Get single tool by ID

router.get('/:id', toolController.getTool);



module.exports = router;