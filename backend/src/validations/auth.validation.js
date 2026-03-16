const { customJoi } = require('./custom.validation');
const { ROLES } = require('../constants/index.constants');
const {
    ALLOWED_AUTH_EMAIL_MESSAGE,
    ALLOWED_AUTH_EMAIL_PATTERN,
} = require('../utils/authEmail.util');

const allowedEmail = () =>
    customJoi
        .string()
        .trim()
        .lowercase()
        .email()
        .pattern(ALLOWED_AUTH_EMAIL_PATTERN)
        .required()
        .messages({
            'string.pattern.base': ALLOWED_AUTH_EMAIL_MESSAGE,
        });

const register = customJoi.object({
    body: customJoi.object({
        email: allowedEmail(),
        password: customJoi.string().password().required(),
        verify_password: customJoi
            .string()
            .equal(customJoi.ref('password'))
            .required(),
        name: customJoi.string().required(),
        role: customJoi
            .string()
            .valid(ROLES.ATTENDEE, ROLES.ORGANIZER)
            .optional(),
        cellphone_number: customJoi.string().when('role', {
            is: ROLES.ORGANIZER,
            then: customJoi.string().required(),
            otherwise: customJoi.string().allow('').optional(),
        }),
        address: customJoi.string().when('role', {
            is: ROLES.ATTENDEE,
            then: customJoi
                .string()
                .valid('MANAGEMENT_SCIENCE', 'ICT', 'ENGINEERING_FEBE', 'ALL_STUDENTS')
                .required(),
            otherwise: customJoi.string().allow('').optional(),
        }),
    }),
});

const login = customJoi.object({
    body: customJoi.object({
        email: allowedEmail(),
        password: customJoi.string().required(),
    }),
});

const refresh = customJoi.object({});

const verifyEmail = customJoi.object({
    body: customJoi.object({
        email: customJoi.string().email().required(),
        code: customJoi.string().length(6).pattern(/^[0-9]+$/).required()
            .messages({ 'string.pattern.base': 'Code must be a 6-digit number' }),
    }),
});

const resendVerification = customJoi.object({
    body: customJoi.object({
        email: customJoi.string().email().required(),
    }),
});

const forgotPassword = customJoi.object({
    body: customJoi.object({
        email: customJoi.string().email().required(),
    }),
});

const resetPassword = customJoi.object({
    body: customJoi.object({
        token: customJoi.string().required(),
        newPassword: customJoi.string().password().required(),
    }),
});

const changePassword = customJoi.object({
    body: customJoi.object({
        currentPassword: customJoi.string().required(),
        newPassword: customJoi.string().password().required(),
    }),
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
};

