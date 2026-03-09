const nodemailer = require('nodemailer');
const { email, clientUrl, env } = require('../configs/environment.config');
const { logger } = require('../utils/index.util');

let transporterPromise = null;

const createTransporter = async () => {
    if (!email.enabled) {
        return null;
    }

    if (email.useEthereal) {
        const testAccount = await nodemailer.createTestAccount();
        logger.info('Using Ethereal SMTP for development emails.', {
            user: testAccount.user,
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
        });

        const etherealTransporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });

        await etherealTransporter.verify();
        logger.info('Ethereal email transporter is configured and ready.');
        return etherealTransporter;
    }

    if (!email.host || !email.port || !email.user || !email.pass) {
        throw new Error('Email is enabled but SMTP settings are incomplete. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASS or enable EMAIL_USE_ETHEREAL=true.');
    }

    const smtpTransporter = nodemailer.createTransport({
        host: email.host,
        port: email.port,
        secure: email.port === 465,
        auth: {
            user: email.user,
            pass: email.pass,
        },
    });

    await smtpTransporter.verify();
    logger.info('SMTP email transporter is configured and ready.');
    return smtpTransporter;
};

const getTransporter = async () => {
    if (!transporterPromise) {
        transporterPromise = createTransporter();
    }
    return transporterPromise;
};

const sendEmail = async (to, subject, text, html) => {
    if (!email.enabled) {
        logger.warn('Email sending is disabled. Skipping email task.', {
            to,
            subject,
        });
        if (env === 'development') {
            logger.debug('Email Text Body:', text);
            logger.debug('Email HTML Body:', html);
        }
        return;
    }

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
    }
};

if (email.enabled) {
    getTransporter().catch((error) => {
        logger.error('Email transporter initialization failed.', { error });
    });
}

const sendVerificationEmail = async (to, token) => {
    const subject = 'Verify Your Email Address';
    const verificationUrl = `${clientUrl}/auth/verify-email?token=${token}`;
    const text = `Please verify your email by clicking the following link: ${verificationUrl}`;
    const html = `<p>Please verify your email by clicking <a href="${verificationUrl}">here</a>.</p>`;

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
};

