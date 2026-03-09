const {
    ApiError,
    asyncHandler,
    verifyToken,
} = require('../utils/index.util');
const { userService } = require('../services/index.service');
const {
    HTTP_STATUS,
    ERROR_MESSAGES,
    TOKEN_TYPE,
} = require('../constants/index.constants');
const { jwt } = require('../configs/environment.config');

const authenticate = asyncHandler(async (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }

    if (!token) {
        return next(
            new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.MISSING_TOKEN)
        );
    }

    const payload = verifyToken(token, jwt.secret);

    if (!payload || payload.type !== TOKEN_TYPE.ACCESS) {
        return next(
            new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.INVALID_TOKEN)
        );
    }

    const user = await userService.findUserById(payload.sub);

    if (!user || !user.active) {
        return next(
            new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.USER_NOT_FOUND)
        );
    }

    req.user = user;
    next();
});

const authorize = (roles) => (req, res, next) => {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    if (!req.user || !requiredRoles.includes(req.user.role)) {
        return next(new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN));
    }
    next();
};

const enforceEmailVerification = (req, res, next) => {
    if (!req.user || !req.user.account || !req.user.account.emailVerified) {
        return next(
            new ApiError(
                HTTP_STATUS.FORBIDDEN,
                ERROR_MESSAGES.EMAIL_NOT_VERIFIED,
                'EMAIL_NOT_VERIFIED'
            )
        );
    }
    next();
};

module.exports = {
    authenticate,
    authorize,
    enforceEmailVerification,
};
