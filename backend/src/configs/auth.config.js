const { encryption } = require('./environment.config');

module.exports = {
    bcryptSaltRounds: encryption.bcryptRounds,
    passwordPolicy: {
        minLength: encryption.passwordMinLength,
        regex: new RegExp(
            `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{${encryption.passwordMinLength},}$`
        ),
        errorMessage: `Password must be at least ${encryption.passwordMinLength} characters long and include at least one uppercase letter, one lowercase letter, and one digit.`,
    },
    maxFailedLogins: 5,
    loginLockoutMinutes: 15,
};

