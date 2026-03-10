const emailService = require('./email.service');
const { logger } = require('../utils/index.util');
const { email } = require('../configs/environment.config');

const buildReference = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `SUP-${y}${m}${d}-${randomPart}`;
};

const submitSupportRequest = async (user, payload) => {
    const reference = buildReference();
    const category = payload.category || 'GENERAL';

    const subject = `[${reference}] ${payload.subject}`;
    const text = [
        'New support request submitted',
        `Reference: ${reference}`,
        `Category: ${category}`,
        `From user ID: ${user.id}`,
        `From user email: ${user.email}`,
        `From user role: ${user.role}`,
        '',
        'Message:',
        payload.message,
    ].join('\n');

    const html = `
        <h3>New Support Request</h3>
        <p><strong>Reference:</strong> ${reference}</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>User ID:</strong> ${user.id}</p>
        <p><strong>User Email:</strong> ${user.email}</p>
        <p><strong>User Role:</strong> ${user.role}</p>
        <p><strong>Subject:</strong> ${payload.subject}</p>
        <p><strong>Message:</strong></p>
        <p>${payload.message.replace(/\n/g, '<br />')}</p>
    `;

    const supportInbox = email.user || 'support@smartevents.local';
    await emailService.sendEmail(supportInbox, subject, text, html);

    logger.info('Support request accepted', {
        reference,
        userId: user.id,
        category,
    });

    return {
        reference,
        category,
    };
};

module.exports = {
    submitSupportRequest,
};
