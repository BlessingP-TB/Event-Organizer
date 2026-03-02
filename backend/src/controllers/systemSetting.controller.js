const { systemSettingService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const getSystemSettings = catchAsync(async (req, res) => {
    const settings = await systemSettingService.getSettings();
    res.status(HTTP_STATUS.OK).send(settings);
});

const getSystemSetting = catchAsync(async (req, res) => {
    const setting = await systemSettingService.getSetting(req.params.key);
    res.status(HTTP_STATUS.OK).send(setting);
});

const upsertSystemSetting = catchAsync(async (req, res) => {
    const { key, value, description } = req.body;
    const setting = await systemSettingService.upsertSetting(
        key,
        value,
        description
    );
    res.status(HTTP_STATUS.OK).send(setting);
});

const deleteSystemSetting = catchAsync(async (req, res) => {
    await systemSettingService.deleteSetting(req.params.key);
    res.status(HTTP_STATUS.NO_CONTENT).send();
});

module.exports = {
    getSystemSettings,
    getSystemSetting,
    upsertSystemSetting,
    deleteSystemSetting,
};