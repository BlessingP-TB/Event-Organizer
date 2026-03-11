const nodemailer = require('nodemailer');
const { email, clientUrl } = require('../configs/environment.config');
const { logger } = require('../utils/index.util');

let transporter;

const isEmailConfigured = () =>
    Boolean(
        email.enabled &&
            email.host &&
            email.port &&
            email.user &&
            email.pass &&
            email.from
    );

const emailConfigured = isEmailConfigured();

if (emailConfigured) {
    transporter = nodemailer.createTransport({
        host: email.host,
        port: email.port,
        secure: email.port === 465,
        auth: {
            user: email.user,
            pass: email.pass,
        },
    });

    transporter.verify()
        .then(() => logger.info('SMTP email transporter is configured and ready.'))
        .catch((err) => logger.warn('SMTP transporter verification failed:', err.message));
};

const getTransporter = async () => {
    if (!transporterPromise) {
        transporterPromise = createTransporter();
    }
    return transporterPromise;
};

const assertEmailReady = () => {
    if (!emailConfigured) {
        throw new Error(
            'Email service is not configured. Set ENABLE_EMAILS=true and provide EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM.'
        );
    }
    if (!transporter) {
        throw new Error('Email transporter is not initialized.');
    }
};

const sendEmail = async (to, subject, text, html) => {
    assertEmailReady();

    try {
        const transporter = await getTransporter();
        if (!transporter) {
            logger.warn('Email sending is disabled. Skipping email task.', {
                to,
                subject,
            });
            return;
        }

        const info = await transporter.sendMail({
            from: email.from || 'no-reply@smartevents.local',
            to,
            subject,
            text,
            html,
        });
        logger.info('Email sent successfully.', {
            messageId: info.messageId,
            recipient: to,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            logger.info('Email preview URL (Ethereal):', { previewUrl });
        }
    } catch (error) {
        logger.error('Error sending email.', { error, recipient: to });
        throw error;
    }
};

const sendVerificationEmail = async (to, code) => {
    const subject = 'SmartEvents - Verify Your Email Address';
    const text = `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0b4f78; text-align: center;">SmartEvents</h2>
            <p style="text-align: center;">Your verification code is:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0b4f78;">${code}</span>
            </div>
            <p style="text-align: center; color: #666;">This code will expire in 10 minutes.</p>
            <p style="text-align: center; color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
    `;

    await sendEmail(to, subject, text, html);
};

const sendResetPasswordEmail = async (to, token) => {
    const subject = 'Reset Your Password';
    const resetUrl = `${clientUrl}/auth/reset-password?token=${token}`;
    const text = `To reset your password, click the following link: ${resetUrl}`;
    const html = `<p>To reset your password, click <a href="${resetUrl}">here</a>.</p>`;

    await sendEmail(to, subject, text, html);
};

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendResetPasswordEmail,
    assertEmailReady,
    isEmailConfigured,
};

