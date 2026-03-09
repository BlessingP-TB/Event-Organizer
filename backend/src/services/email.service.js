const nodemailer = require('nodemailer');
const { email, clientUrl, env } = require('../configs/environment.config');
const { logger } = require('../utils/index.util');

let transporter;
if (email.enabled) {
    transporter = nodemailer.createTransport({
        host: email.host,
        port: email.port,
        secure: email.port === 465,
        auth: {
            user: email.user,
            pass: email.pass,
        },
    });

    transporter
        .verify()
        .then(() => logger.info('Email transporter is configured and ready.'))
        .catch((error) =>
            logger.error('Email transporter verification failed.', error)
        );
}

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
        const info = await transporter.sendMail({
            from: email.from,
            to,
            subject,
            text,
            html,
        });
        logger.info('Email sent successfully.', {
            messageId: info.messageId,
            recipient: to,
        });
    } catch (error) {
        logger.error('Error sending email.', { error, recipient: to });
    }
};

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

