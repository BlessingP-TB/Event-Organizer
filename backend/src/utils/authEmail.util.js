const ALLOWED_AUTH_EMAIL_DOMAINS = ['tut4life.ac.za', 'tut.ac.za'];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TUT4LIFE_LOCAL_PART_PATTERN = /^\d{9}$/;
const TUT_LOCAL_PART_PATTERN = /^[^\s@]+$/;

const ALLOWED_AUTH_EMAIL_PATTERN = new RegExp(
    `^(?:\\d{9}@${escapeRegex('tut4life.ac.za')}|[^\\s@]+@${escapeRegex('tut.ac.za')})$`,
    'i'
);

const ALLOWED_AUTH_EMAIL_MESSAGE =
    'Use a @tut.ac.za email, or a @tut4life.ac.za email with exactly 9 digits before the @.';

const normalizeAuthEmail = (email = '') => String(email).trim().toLowerCase();

const isAllowedAuthEmail = (email = '') => {
    const normalizedEmail = normalizeAuthEmail(email);
    const [localPart, domain, ...rest] = normalizedEmail.split('@');

    if (!localPart || !domain || rest.length > 0) {
        return false;
    }

    if (domain === 'tut4life.ac.za') {
        return TUT4LIFE_LOCAL_PART_PATTERN.test(localPart);
    }

    if (domain === 'tut.ac.za') {
        return TUT_LOCAL_PART_PATTERN.test(localPart);
    }

    return false;
};

module.exports = {
    ALLOWED_AUTH_EMAIL_DOMAINS,
    ALLOWED_AUTH_EMAIL_PATTERN,
    ALLOWED_AUTH_EMAIL_MESSAGE,
    TUT4LIFE_LOCAL_PART_PATTERN,
    normalizeAuthEmail,
    isAllowedAuthEmail,
};