const bcrypt = require('bcrypt');
const userService = require('./user.service');
const emailService = require('./email.service');
const {
    prisma,
    ApiError,
    generateAuthTokens,
    verifyToken,
    generateVerifyEmailToken,
    generateResetPasswordToken,
    safeUserSelect,
} = require('../utils/index.util');
const {
    auth: authConfig,
    env: envConfig,
} = require('../configs/index.config');
const jwtConfig = envConfig.jwt;
const {
    HTTP_STATUS,
    ERROR_MESSAGES,
    TOKEN_TYPE,
    ROLES,
    APPROVAL_TYPE,
    APPROVAL_STATUS,
} = require('../constants/index.constants');

const createToken = async (
    userId,
    type,
    expirationMinutes,
    ipAddress,
    userAgent,
    tx = prisma
) => {
    const user = await tx.user.findUnique({
        where: { id: userId },
        include: { account: true },
    });
    if (!user || !user.account) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
    }

    await tx.authToken.deleteMany({
        where: { accountId: user.account.id, type },
    });

    let tokenString;
    if (type === TOKEN_TYPE.VERIFY_EMAIL) {
        tokenString = generateVerifyEmailToken(userId);
    } else if (type === TOKEN_TYPE.RESET_PASSWORD) {
        tokenString = generateResetPasswordToken(userId);
    } else {
        throw new Error('Invalid token type generation');
    }

    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    await tx.authToken.create({
        data: {
            accountId: user.account.id,
            type,
            token: tokenString,
            expiresAt,
            ipAddress,
            userAgent,
        },
    });
    return tokenString;
};

const createSession = async (
    accountId,
    refreshToken,
    ipAddress,
    userAgent,
    tx = prisma
) => {
    const { exp } = verifyToken(refreshToken, jwtConfig.refreshSecret);
    const expiresAt = new Date(exp * 1000);

    await tx.authToken.create({
        data: {
            accountId,
            type: TOKEN_TYPE.REFRESH,
            token: refreshToken,
            expiresAt,
            ipAddress,
            userAgent,
        },
    });

    return tx.session.create({
        data: {
            accountId,
            expiresAt,
            ipAddress,
            userAgent,
        },
    });
};

const findAndVerifyToken = async (token, type) => {
    const tokenRecord = await prisma.authToken.findFirst({
        where: { token, type },
    });

    if (!tokenRecord) {
        throw new ApiError(
            HTTP_STATUS.NOT_FOUND,
            ERROR_MESSAGES.INVALID_TOKEN,
            'TOKEN_NOT_FOUND'
        );
    }

    if (tokenRecord.expiresAt < new Date()) {
        await prisma.authToken.delete({ where: { id: tokenRecord.id } });
        throw new ApiError(
            HTTP_STATUS.UNAUTHORIZED,
            ERROR_MESSAGES.INVALID_TOKEN,
            'TOKEN_EXPIRED'
        );
    }

    const secret =
        type === TOKEN_TYPE.REFRESH
            ? jwtConfig.refreshSecret
            : jwtConfig.secret;
    const payload = verifyToken(token, secret);
    if (!payload) {
        throw new ApiError(
            HTTP_STATUS.UNAUTHORIZED,
            ERROR_MESSAGES.INVALID_TOKEN,
            'TOKEN_INVALID'
        );
    }

    return tokenRecord;
};

const register = async (registerBody) => {
    const { email, password, name, role, cellphone_number } = registerBody;

    const existingUser = await userService.findUserByEmail(email);
    if (existingUser) {
        throw new ApiError(
            HTTP_STATUS.CONFLICT,
            ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
            'EMAIL_CONFLICT'
        );
    }

    const { user, verificationToken } = await prisma.$transaction(async (tx) => {
        const passwordHash = await bcrypt.hash(
            password,
            authConfig.bcryptSaltRounds
        );
        const userRole = role || ROLES.ATTENDEE;

        const createdUser = await tx.user.create({
            data: {
                email,
                name,
                cellphone_number,
                role: userRole,
                account: {
                    create: {
                        passwordHash,
                        emailVerified: false,
                    },
                },
            },
            select: safeUserSelect,
        });

        if (userRole === ROLES.ORGANIZER) {
            const profile = await tx.organizerProfile.create({
                data: {
                    userId: createdUser.id,
                    verified: false,
                },
            });

            await tx.approval.create({
                data: {
                    targetType: 'OrganizerProfile',
                    targetId: profile.id,
                    organizerProfileId: profile.id,
                    type: APPROVAL_TYPE.ORGANIZER_DOC,
                    status: APPROVAL_STATUS.PENDING,
                    notes: 'New organizer registration pending verification.',
                },
            });
        }

        const token = await createToken(
            createdUser.id,
            TOKEN_TYPE.VERIFY_EMAIL,
            jwtConfig.verifyEmailExpirationMinutes,
            null,
            null,
            tx
        );
        return { user: createdUser, verificationToken: token };
    });

    await emailService.sendVerificationEmail(user.email, verificationToken);

    return user;
};

const login = async (email, password, ipAddress, userAgent) => {
    const userWithAccount = await prisma.user.findUnique({
        where: { email },
        include: { account: true },
    });

    const accountLockedError = new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        'Account locked due to too many failed attempts. Please try again later.',
        'ACCOUNT_LOCKED'
    );
    const invalidCredentialsError = new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.INVALID_EMAIL_OR_PASSWORD,
        'INVALID_CREDENTIALS'
    );

    if (!userWithAccount || !userWithAccount.account) {
        throw invalidCredentialsError;
    }

    if (userWithAccount.account.lockedAt) {
        const lockExpiry = new Date(
            userWithAccount.account.lockedAt.getTime() +
            authConfig.loginLockoutMinutes * 60 * 1000
        );
        if (new Date() < lockExpiry) {
            throw accountLockedError;
        } else {
            await prisma.account.update({
                where: { id: userWithAccount.account.id },
                data: {
                    lockedAt: null,
                    failedLoginAttempts: 0,
                },
            });
            userWithAccount.account.lockedAt = null;
            userWithAccount.account.failedLoginAttempts = 0;
        }
    }

    const isPasswordMatch = await bcrypt.compare(
        password,
        userWithAccount.account.passwordHash
    );

    if (!isPasswordMatch) {
        const currentAttempts = userWithAccount.account.failedLoginAttempts + 1;
        let updateData = {
            failedLoginAttempts: currentAttempts,
        };

        if (currentAttempts >= authConfig.maxFailedLogins) {
            updateData.lockedAt = new Date();
        }

        await prisma.account.update({
            where: { id: userWithAccount.account.id },
            data: updateData,
        });

        if (updateData.lockedAt) {
            throw accountLockedError;
        } else {
            throw invalidCredentialsError;
        }
    }

    if (userWithAccount.account.failedLoginAttempts > 0) {
        await prisma.account.update({
            where: { id: userWithAccount.account.id },
            data: {
                failedLoginAttempts: 0,
            },
        });
    }

    const user = await userService.findUserById(userWithAccount.id);

    const tokens = generateAuthTokens(user);
    await createSession(
        userWithAccount.account.id,
        tokens.refreshToken,
        ipAddress,
        userAgent
    );

    return { user, tokens };
};

const refresh = async (refreshToken, ipAddress, userAgent) => {
    const payload = verifyToken(refreshToken, jwtConfig.refreshSecret);
    if (!payload || payload.type !== TOKEN_TYPE.REFRESH) {
        throw new ApiError(
            HTTP_STATUS.UNAUTHORIZED,
            ERROR_MESSAGES.INVALID_TOKEN,
            'TOKEN_INVALID'
        );
    }

    const tokenRecord = await prisma.authToken.findFirst({
        where: { token: refreshToken, type: TOKEN_TYPE.REFRESH },
        include: {
            account: {
                include: {
                    user: {
                        select: safeUserSelect,
                    },
                },
            },
        },
    });

    if (!tokenRecord) {
        const user = await userService.findUserById(payload.sub);
        if (user && user.account) {
            await userService.deleteAllUserSessions(user.id);
        }
        throw new ApiError(
            HTTP_STATUS.UNAUTHORIZED,
            'Token reuse detected. All sessions have been logged out for security.',
            'TOKEN_REUSE_DETECTED'
        );
    }

    if (tokenRecord.expiresAt < new Date()) {
        await userService.deleteAllUserSessions(tokenRecord.account.userId);
        throw new ApiError(
            HTTP_STATUS.UNAUTHORIZED,
            ERROR_MESSAGES.INVALID_TOKEN,
            'TOKEN_EXPIRED'
        );
    }

    const { user } = tokenRecord.account;

    const tokens = await prisma.$transaction(async (tx) => {
        await tx.authToken.delete({ where: { id: tokenRecord.id } });

        const newTokens = generateAuthTokens(user);
        await createSession(
            user.account.id,
            newTokens.refreshToken,
            ipAddress,
            userAgent,
            tx
        );
        return newTokens;
    });

    return tokens;
};

const verifyEmail = async (token) => {
    const tokenRecord = await findAndVerifyToken(
        token,
        TOKEN_TYPE.VERIFY_EMAIL
    );

    await prisma.account.update({
        where: { id: tokenRecord.accountId },
        data: { emailVerified: true },
    });

    await prisma.authToken.delete({ where: { id: tokenRecord.id } });
};

const resendVerification = async (email) => {
    const user = await userService.findUserByEmail(email);
    if (!user) {
        throw new ApiError(
            HTTP_STATUS.NOT_FOUND,
            ERROR_MESSAGES.EMAIL_NOT_FOUND
        );
    }
    if (user.account.emailVerified) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED
        );
    }

    const verificationToken = await createToken(
        user.id,
        TOKEN_TYPE.VERIFY_EMAIL,
        jwtConfig.verifyEmailExpirationMinutes
    );
    await emailService.sendVerificationEmail(user.email, verificationToken);
};

const forgotPassword = async (email) => {
    const user = await userService.findUserByEmail(email);
    if (!user) {
        throw new ApiError(
            HTTP_STATUS.NOT_FOUND,
            ERROR_MESSAGES.EMAIL_NOT_FOUND
        );
    }

    const resetToken = await createToken(
        user.id,
        TOKEN_TYPE.RESET_PASSWORD,
        jwtConfig.resetPasswordExpirationMinutes
    );
    await emailService.sendResetPasswordEmail(user.email, resetToken);
};

const resetPassword = async (token, newPassword) => {
    const tokenRecord = await findAndVerifyToken(
        token,
        TOKEN_TYPE.RESET_PASSWORD
    );

    const newPasswordHash = await bcrypt.hash(
        newPassword,
        authConfig.bcryptSaltRounds
    );

    const account = await prisma.account.findUnique({
        where: { id: tokenRecord.accountId },
    });
    if (!account) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Account not found.');
    }

    await prisma.account.update({
        where: { id: account.id },
        data: {
            passwordHash: newPasswordHash,
            lockedAt: null,
            failedLoginAttempts: 0,
        },
    });

    await prisma.authToken.delete({ where: { id: tokenRecord.id } });
    await prisma.session.deleteMany({
        where: { accountId: account.id },
    });
};

const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { account: true },
    });
    if (!user || !user.account) {
        throw new ApiError(
            HTTP_STATUS.NOT_FOUND,
            ERROR_MESSAGES.USER_NOT_FOUND
        );
    }

    const isPasswordMatch = await bcrypt.compare(
        currentPassword,
        user.account.passwordHash
    );

    if (!isPasswordMatch) {
        throw new ApiError(
            HTTP_STATUS.UNAUTHORIZED,
            ERROR_MESSAGES.OLD_PASSWORD_INCORRECT
        );
    }

    const newPasswordHash = await bcrypt.hash(
        newPassword,
        authConfig.bcryptSaltRounds
    );

    await prisma.account.update({
        where: { id: user.account.id },
        data: {
            passwordHash: newPasswordHash,
            lockedAt: null,
            failedLoginAttempts: 0,
        },
    });

    await prisma.session.deleteMany({ where: { accountId: user.account.id } });
};

const logout = async (refreshToken) => {
    const tokenRecord = await prisma.authToken.findFirst({
        where: { token: refreshToken, type: TOKEN_TYPE.REFRESH },
    });

    if (tokenRecord) {
        await prisma.authToken.delete({ where: { id: tokenRecord.id } });
    }
};

module.exports = {
    register,
    login,
    refresh,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    changePassword,
    logout,
};