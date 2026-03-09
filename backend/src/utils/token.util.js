const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../configs/environment.config');
const { TOKEN_TYPE } = require('../constants/index.constants');

const generateToken = (
    payload,
    secret,
    expiresIn,
    type,
    audience,
    issuer
) => {
    const options = {
        expiresIn,
        audience: audience || 'self',
        issuer: issuer || 'event-handler-api',
    };
    return jwt.sign({ ...payload, type }, secret, options);
};

const verifyToken = (token, secret) => {
    try {
        return jwt.verify(token, secret);
    } catch (error) {
        return null;
    }
};

const generateAuthTokens = (user) => {
    const accessTokenPayload = {
        sub: user.id,
        role: user.role,
    };
    const accessToken = generateToken(
        accessTokenPayload,
        jwtConfig.secret,
        jwtConfig.accessExpiry,
        TOKEN_TYPE.ACCESS
    );

    const refreshTokenPayload = {
        sub: user.id,
        role: user.role,
    };
    const refreshToken = generateToken(
        refreshTokenPayload,
        jwtConfig.refreshSecret,
        jwtConfig.refreshExpiry,
        TOKEN_TYPE.REFRESH
    );

    return {
        accessToken,
        refreshToken,
    };
};

const generateVerifyEmailToken = (userId) => {
    const expires = `${jwtConfig.verifyEmailExpirationMinutes}m`;
    return generateToken(
        { sub: userId },
        jwtConfig.secret,
        expires,
        TOKEN_TYPE.VERIFY_EMAIL
    );
};

const generateResetPasswordToken = (userId) => {
    const expires = `${jwtConfig.resetPasswordExpirationMinutes}m`;
    return generateToken(
        { sub: userId },
        jwtConfig.secret,
        expires,
        TOKEN_TYPE.RESET_PASSWORD
    );
};

module.exports = {
    generateToken,
    verifyToken,
    generateAuthTokens,
    generateVerifyEmailToken,
    generateResetPasswordToken,
};