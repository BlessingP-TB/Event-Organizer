const { authService, userService } = require('../services/index.service');
const { catchAsync, ApiError } = require('../utils/index.util');
const {
    HTTP_STATUS,
    SUCCESS_MESSAGES,
    ERROR_MESSAGES,
} = require('../constants/index.constants');
const { env } = require('../configs/index.config');

const cookieOptions = {
    httpOnly: true,
    secure: env.env === 'production',
    sameSite: 'strict',
    maxAge: env.jwt.refreshExpiryMs,
};

const register = catchAsync(async (req, res) => {
    const user = await authService.register(req.body);
    res.status(HTTP_STATUS.CREATED).send({
        message: SUCCESS_MESSAGES.REGISTER_SUCCESS,
        user,
    });
});

const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    // --- FIX ---
    // Get userAgent from headers and ip from req.ip
    /* const { 'user-agent': userAgent } = req.headers;
     const ipAddress = req.ip;*/
    const { ip: ipAddress, 'user-agent': userAgent } = req.headers;
    // --- END FIX ---
    const { user, tokens } = await authService.login(
        email,
        password,
        ipAddress,
        userAgent
    );
    res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

    res.status(HTTP_STATUS.OK).send({
        message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
        user,
        accessToken: tokens.accessToken,
    });
});

const refresh = catchAsync(async (req, res) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
        throw new ApiError(
            HTTP_STATUS.UNAUTHORIZED,
            ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED,
            'REFRESH_TOKEN_MISSING'
        );
    }

    const { ip: ipAddress, 'user-agent': userAgent } = req.headers;
    const tokens = await authService.refresh(
        refreshToken,
        ipAddress,
        userAgent
    );

    res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

    res.status(HTTP_STATUS.OK).send({
        message: SUCCESS_MESSAGES.TOKEN_REFRESHED,
        accessToken: tokens.accessToken,
    });
});

const verifyEmail = catchAsync(async (req, res) => {
    await authService.verifyEmail(req.body.token);
    res.status(HTTP_STATUS.OK).send({ message: SUCCESS_MESSAGES.EMAIL_VERIFIED });
});

const resendVerification = catchAsync(async (req, res) => {
    await authService.resendVerification(req.body.email);
    res.status(HTTP_STATUS.OK).send({
        message: SUCCESS_MESSAGES.VERIFICATION_SENT,
    });
});

const forgotPassword = catchAsync(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    res.status(HTTP_STATUS.OK).send({
        message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT,
    });
});

const resetPassword = catchAsync(async (req, res) => {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    res.status(HTTP_STATUS.OK).send({
        message: SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS,
    });
});

const changePassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
    );
    res.status(HTTP_STATUS.OK).send({
        message: SUCCESS_MESSAGES.PASSWORD_CHANGED,
    });
});

const logout = catchAsync(async (req, res) => {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
        await authService.logout(refreshToken);
    }
    res.clearCookie('refreshToken', cookieOptions);
    res.status(HTTP_STATUS.OK).send({ message: SUCCESS_MESSAGES.LOGOUT_SUCCESS });
});

const logoutAll = catchAsync(async (req, res) => {
    await userService.deleteAllUserSessions(req.user.id);
    res.clearCookie('refreshToken', cookieOptions);
    res.status(HTTP_STATUS.OK).send({
        message: SUCCESS_MESSAGES.SESSIONS_REVOKED,
    });
});

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
    logoutAll,
};
