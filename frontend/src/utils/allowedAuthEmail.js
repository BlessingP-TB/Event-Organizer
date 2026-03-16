export const ALLOWED_AUTH_EMAIL_PATTERN =
  /^(?:\d{9}@tut4life\.ac\.za|[^\s@]+@tut\.ac\.za)$/i;

export const ALLOWED_AUTH_EMAIL_MESSAGE =
  'Use a @tut.ac.za email, or a @tut4life.ac.za email with exactly 9 digits before the @.';

export const normalizeAuthEmail = (email = '') => email.trim().toLowerCase();

export const isAllowedAuthEmail = (email = '') =>
  ALLOWED_AUTH_EMAIL_PATTERN.test(normalizeAuthEmail(email));