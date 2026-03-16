const { Server } = require('socket.io');
const { verifyToken } = require('./token.util');
const { jwt } = require('../configs/environment.config');

let ioInstance = null;

const extractToken = (socket) => {
    const authToken = socket?.handshake?.auth?.token;
    if (authToken) return authToken;

    const queryToken = socket?.handshake?.query?.token;
    if (queryToken) return queryToken;

    const header = socket?.handshake?.headers?.authorization;
    if (!header || typeof header !== 'string') return null;
    if (!header.startsWith('Bearer ')) return null;
    return header.slice(7);
};

const initRealtime = ({ server, corsOptions }) => {
    ioInstance = new Server(server, {
        cors: {
            origin: corsOptions?.origin,
            methods: corsOptions?.methods || ['GET', 'POST'],
            credentials: corsOptions?.credentials ?? true,
            allowedHeaders: corsOptions?.allowedHeaders || ['Authorization'],
        },
    });

    ioInstance.use((socket, next) => {
        const token = extractToken(socket);
        if (!token) return next(new Error('Unauthorized'));

        const payload = verifyToken(token, jwt.secret);
        if (!payload?.sub) return next(new Error('Unauthorized'));

        socket.userId = payload.sub;
        return next();
    });

    ioInstance.on('connection', (socket) => {
        socket.join(`user:${socket.userId}`);
    });

    return ioInstance;
};

const getRealtime = () => ioInstance;

const emitUserNotification = ({ userId, notification }) => {
    if (!ioInstance || !userId || !notification) return;
    ioInstance.to(`user:${userId}`).emit('notification:new', notification);
};

module.exports = {
    initRealtime,
    getRealtime,
    emitUserNotification,
};
