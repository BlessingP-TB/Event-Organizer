const { env } = require('../configs/environment.config');

const formatLog = (level, message, context = null) => {
    const timestamp = new Date().toISOString();
    let log = `${timestamp} [${level.toUpperCase()}] ${message}`;
    if (context) {
        try {
            const sanitizedContext = JSON.parse(
                JSON.stringify(context, (key, value) =>
                    key.match(/password|token|secret/i) ? 'REDACTED' : value
                )
            );
            log += `\nContext: ${JSON.stringify(sanitizedContext, null, 2)}`;
        } catch (e) {
            log += `\nContext: [Unserializable]`;
        }
    }
    return log;
};

const logger = {
    info: (message, context = null) => {
        console.log(formatLog('info', message, context));
    },
    warn: (message, context = null) => {
        console.warn(formatLog('warn', message, context));
    },
    error: (message, context = null) => {
        console.error(formatLog('error', message, context));
    },
    debug: (message, context = null) => {
        if (env === 'development') {
            console.debug(formatLog('debug', message, context));
        }
    },
};

module.exports = logger;
