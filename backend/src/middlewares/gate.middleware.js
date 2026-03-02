const { verifyToken, ApiError } = require('../utils/index.util');
const { jwt } = require('../configs/environment.config');
const {
    HTTP_STATUS,
    ROLES,
    TOKEN_TYPE,
    ERROR_MESSAGES,
} = require('../constants/index.constants');

const preventAdminAccess = (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }

    if (token) {
        try {
            const payload = verifyToken(token, jwt.secret);
            if (
                payload &&
                payload.type === TOKEN_TYPE.ACCESS &&
                payload.role === ROLES.ADMIN
            ) {
                return next(
                    new ApiError(
                        HTTP_STATUS.FORBIDDEN,
                        ERROR_MESSAGES.ADMIN_ACCESS_FORBIDDEN,
                        'ADMIN_ACCESS_FORBIDDEN'
                    )
                );
            }
        } catch (error) {
        }
    }
    next();
};

module.exports = {
    preventAdminAccess,
};