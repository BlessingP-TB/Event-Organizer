const { themeService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const createTheme = catchAsync(async (req, res) => {
    const theme = await themeService.createTheme(req.body);
    res.status(HTTP_STATUS.CREATED).send(theme);
});

const listThemes = catchAsync(async (req, res) => {
    const themes = await themeService.listThemes();
    res.status(HTTP_STATUS.OK).send(themes);
});

const getTheme = catchAsync(async (req, res) => {
    const theme = await themeService.getThemeById(req.params.id);
    res.status(HTTP_STATUS.OK).send(theme);
});

const updateTheme = catchAsync(async (req, res) => {
    const theme = await themeService.updateTheme(req.params.id, req.body);
    res.status(HTTP_STATUS.OK).send(theme);
});

const deleteTheme = catchAsync(async (req, res) => {
    await themeService.deleteTheme(req.params.id);
    res.status(HTTP_STATUS.NO_CONTENT).send();
});

module.exports = {
    createTheme,
    listThemes,
    getTheme,
    updateTheme,
    deleteTheme,
};
