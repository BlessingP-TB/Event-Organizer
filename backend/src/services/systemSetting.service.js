const { prisma, ApiError } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const getSetting = async (key) => {
    return prisma.systemSetting.findUnique({
        where: { key },
    });
};

const getSettings = async () => {
    return prisma.systemSetting.findMany({
        orderBy: { key: 'asc' },
    });
};

const upsertSetting = async (key, value, description) => {
    return prisma.systemSetting.upsert({
        where: { key },
        create: { key, value, description },
        update: { value, description },
    });
};

const deleteSetting = async (key) => {
    try {
        await prisma.systemSetting.delete({
            where: { key },
        });
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ApiError(
                HTTP_STATUS.NOT_FOUND,
                'Setting not found.'
            );
        }
        throw error;
    }
};

module.exports = {
    getSetting,
    getSettings,
    upsertSetting,
    deleteSetting,
};