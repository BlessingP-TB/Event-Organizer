const express = require('express');
const { themeController } = require('../controllers/index.controller');
const { themeValidation } = require('../validations/index.validation');
const {
    validate,
    authenticate,
    authorize,
    enforceEmailVerification,
} = require('../middlewares/index.middleware');
const { ROLES } = require('../constants/index.constants');

const router = express.Router();

router.get(
    '/',
    validate(themeValidation.listThemes),
    themeController.listThemes
);

router.use(
    authenticate,
    authorize([ROLES.ADMIN, ROLES.ORGANIZER]),
    enforceEmailVerification
);

router.post('/',
    validate(themeValidation.createTheme),
    themeController.createTheme);

router
    .route('/:id')
    .get(validate(themeValidation.themeIdParam), themeController.getTheme)
    .patch(validate(themeValidation.updateTheme), themeController.updateTheme)
    .delete(validate(themeValidation.themeIdParam), themeController.deleteTheme);

module.exports = router;