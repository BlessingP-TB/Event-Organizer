const { customJoi } = require('./custom.validation');
const { ROLES } = require('../constants/index.constants');

const register = customJoi.object({
    body: customJoi.object({
        email: customJoi.string().email().required(),
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
    }),
});

const login = customJoi.object({
    body: customJoi.object({
        email: customJoi.string().email().required(),
        password: customJoi.string().required(),
    }),
});

const refresh = customJoi.object({});

const verifyEmail = customJoi.object({
    body: customJoi.object({
        token: customJoi.string().required(),
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

