const { prisma, ApiError } = require('../utils/index.util');
const {
    HTTP_STATUS,
    ERROR_MESSAGES,
} = require('../constants/index.constants');

const findUserByEmail = async (email) => {
    return prisma.user.findFirst({
        where: { email },
        include: { account: true },
    });
};

const findUserById = async (userId) => {
    return prisma.user.findFirst({
        where: { id: userId },
        include: { account: { select: { emailVerified: true } } },
    });
};

const updateUserProfile = async (userId, updateBody) => {
    return prisma.user.update({
        where: { id: userId },
        data: updateBody,
        select: {
            id: true,
            email: true,
            name: true,
            cellphone_number: true,
            updatedAt: true,
        },
    });
};

const getUserSessions = async (userId) => {
    const user = await findUserById(userId);
    if (!user || !user.account) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return prisma.session.findMany({
        where: { accountId: user.account.id },
    });
};

const deleteUserSession = async (userId, sessionId) => {
    const user = await findUserById(userId);
    if (!user || !user.account) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const session = await prisma.session.findUnique({
        where: { id: sessionId },
    });

    if (!session || session.accountId !== user.account.id) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
    }

    await prisma.session.delete({ where: { id: sessionId } });
};

const deleteAllUserSessions = async (userId) => {
    const user = await findUserById(userId);
    if (!user || !user.account) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const accountId = user.account.id;
    await prisma.$transaction([
        prisma.session.deleteMany({ where: { accountId } }),
        prisma.authToken.deleteMany({ where: { accountId } }),
    ]);
};

module.exports = {
    findUserByEmail,
    findUserById,
    updateUserProfile,
    getUserSessions,
    deleteUserSession,
    deleteAllUserSessions,
};