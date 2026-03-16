const { prisma, ApiError } = require('../utils/index.util');
const { HTTP_STATUS, ROLES } = require('../constants/index.constants');
const { randomUUID } = require('crypto');
const axios = require('axios');

let tableInitialized = false;
let pushTableInitialized = false;

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_BATCH_SIZE = 100;

const ensureNotificationTable = async () => {
    if (tableInitialized) return;

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS notification (
            id VARCHAR(36) NOT NULL,
            userId VARCHAR(191) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            \`read\` BOOLEAN NOT NULL DEFAULT false,
            createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (id),
            INDEX notification_userId_createdAt_idx (userId, createdAt)
        );
    `);

    tableInitialized = true;
};

const ensurePushTokenTable = async () => {
    if (pushTableInitialized) return;

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS notification_push_token (
            id VARCHAR(36) NOT NULL,
            userId VARCHAR(191) NOT NULL,
            token VARCHAR(255) NOT NULL,
            platform VARCHAR(32) NULL,
            createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (id),
            UNIQUE KEY notification_push_token_token_uq (token),
            INDEX notification_push_token_user_idx (userId)
        );
    `);

    pushTableInitialized = true;
};

const isExpoPushToken = (value) => {
    if (typeof value !== 'string') return false;
    return /^(ExpoPushToken|ExponentPushToken)\[[^\]]+\]$/.test(value.trim());
};

const chunkArray = (items, size) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
};

const deleteInvalidPushTokens = async (tokens) => {
    if (!tokens.length) return;

    const placeholders = tokens.map(() => '?').join(', ');
    await prisma.$executeRawUnsafe(
        `DELETE FROM notification_push_token WHERE token IN (${placeholders})`,
        ...tokens
    );
};

const sendPushToUsers = async ({ userIds, title, message, data = {} }) => {
    const uniqueUserIds = [...new Set((userIds || []).filter(Boolean))];
    if (!uniqueUserIds.length) return;

    await ensurePushTokenTable();

    const placeholders = uniqueUserIds.map(() => '?').join(', ');
    const rows = await prisma.$queryRawUnsafe(
        `SELECT token FROM notification_push_token WHERE userId IN (${placeholders})`,
        ...uniqueUserIds
    );

    const messages = rows
        .map((row) => row.token)
        .filter(isExpoPushToken)
        .map((token) => ({
            to: token,
            sound: 'default',
            title,
            body: message,
            data,
        }));

    if (!messages.length) return;

    const invalidTokens = [];
    const batches = chunkArray(messages, EXPO_PUSH_BATCH_SIZE);

    for (const batch of batches) {
        try {
            const response = await axios.post(EXPO_PUSH_API_URL, batch, {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            });

            const tickets = Array.isArray(response?.data?.data)
                ? response.data.data
                : [];

            tickets.forEach((ticket, index) => {
                if (
                    ticket?.status === 'error'
                    && ticket?.details?.error === 'DeviceNotRegistered'
                ) {
                    invalidTokens.push(batch[index]?.to);
                }
            });
        } catch (error) {
            console.warn('Expo push send failed:', error?.response?.data || error?.message || error);
        }
    }

    const sanitizedInvalidTokens = invalidTokens.filter(Boolean);
    if (sanitizedInvalidTokens.length) {
        await deleteInvalidPushTokens(sanitizedInvalidTokens);
    }
};

const mapNotification = (row) => ({
    id: row.id,
    userId: row.userId,
    title: row.title,
    message: row.message,
    read: Boolean(row.read),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

const createNotificationRecord = async ({ userId, title, message }, db = prisma) => {
    await ensureNotificationTable();

    const newId = randomUUID();
    await db.$executeRawUnsafe(
        `INSERT INTO notification (id, userId, title, message, \`read\`, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
        newId,
        userId,
        title,
        message
    );

    const [created] = await db.$queryRawUnsafe(
        `SELECT id, userId, title, message, \`read\`, createdAt, updatedAt
         FROM notification
         WHERE id = ?`,
        newId
    );

    const mapped = mapNotification(created);
    sendPushToUsers({
        userIds: [userId],
        title,
        message,
        data: { notificationId: mapped.id },
    }).catch((error) => {
        console.warn('Failed to send push notification:', error?.message || error);
    });

    return mapped;
};

const assertCanTarget = (currentUser, targetUserId, targetRole) => {
    if (currentUser.role === ROLES.ADMIN) return;

    if (
        currentUser.role === ROLES.ORGANIZER
        && targetRole === ROLES.ADMIN
        && !targetUserId
    ) {
        return;
    }

    if (targetRole) {
        throw new ApiError(
            HTTP_STATUS.FORBIDDEN,
            'Only admins can create role-wide notifications.'
        );
    }

    if (targetUserId && targetUserId !== currentUser.id) {
        throw new ApiError(
            HTTP_STATUS.FORBIDDEN,
            'You can only create notifications for your own account.'
        );
    }
};

const listNotifications = async ({ currentUser, userId }) => {
    await ensureNotificationTable();
    const effectiveUserId = currentUser.role === ROLES.ADMIN && userId ? userId : currentUser.id;

    const rows = await prisma.$queryRawUnsafe(
        `SELECT id, userId, title, message, \`read\`, createdAt, updatedAt
         FROM notification
         WHERE userId = ?
         ORDER BY createdAt DESC`,
        effectiveUserId
    );

    return rows.map(mapNotification);
};

const createNotification = async ({ currentUser, body }) => {
    await ensureNotificationTable();
    const { title, message, userId, role } = body;

    assertCanTarget(currentUser, userId, role);

    if (role) {
        const users = await prisma.$queryRawUnsafe(
            `SELECT id FROM user WHERE role = ? AND active = true AND deletedAt IS NULL`,
            role
        );

        if (!users.length) {
            return [];
        }

        const createdItems = [];
        for (const user of users) {
            const newId = randomUUID();
            await prisma.$executeRawUnsafe(
                `INSERT INTO notification (id, userId, title, message, \`read\`, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
                newId,
                user.id,
                title,
                message
            );
            createdItems.push({
                id: newId,
                userId: user.id,
                title,
                message,
                read: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        sendPushToUsers({
            userIds: users.map((user) => user.id),
            title,
            message,
            data: { notificationType: 'role-broadcast' },
        }).catch((error) => {
            console.warn('Failed to send role push notification:', error?.message || error);
        });

        return createdItems;
    }

    const targetUserId = userId || currentUser.id;
    return createNotificationRecord({ userId: targetUserId, title, message });
};

const createSystemNotification = async ({ userId, title, message, tx }) => {
    return createNotificationRecord({ userId, title, message }, tx || prisma);
};

const createSystemRoleNotification = async ({ roles, title, message, tx }) => {
    const db = tx || prisma;
    await ensureNotificationTable();

    const normalizedRoles = [...new Set((roles || []).filter(Boolean))];
    if (!normalizedRoles.length) {
        return [];
    }

    const placeholders = normalizedRoles.map(() => '?').join(', ');
    const users = await db.$queryRawUnsafe(
        `SELECT id FROM user WHERE role IN (${placeholders}) AND active = true AND deletedAt IS NULL`,
        ...normalizedRoles
    );

    if (!users.length) {
        return [];
    }

    const createdItems = [];
    for (const user of users) {
        const createdNotification = await createNotificationRecord({
            userId: user.id,
            title,
            message,
        }, db);
        createdItems.push(createdNotification);
    }

    return createdItems;
};

const updateNotification = async ({ currentUser, notificationId, body }) => {
    await ensureNotificationTable();
    const [existing] = await prisma.$queryRawUnsafe(
        `SELECT id, userId FROM notification WHERE id = ?`,
        notificationId
    );

    if (!existing) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Notification not found.');
    }

    if (currentUser.role !== ROLES.ADMIN && existing.userId !== currentUser.id) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Not allowed to update this notification.');
    }

    const updateFields = [];
    const values = [];

    if (typeof body.title === 'string') {
        updateFields.push('title = ?');
        values.push(body.title);
    }
    if (typeof body.message === 'string') {
        updateFields.push('message = ?');
        values.push(body.message);
    }
    if (typeof body.read === 'boolean') {
        updateFields.push('`read` = ?');
        values.push(body.read);
    }

    if (updateFields.length === 0) {
        const [current] = await prisma.$queryRawUnsafe(
            `SELECT id, userId, title, message, \`read\`, createdAt, updatedAt
             FROM notification
             WHERE id = ?`,
            notificationId
        );
        return mapNotification(current);
    }

    values.push(notificationId);
    await prisma.$executeRawUnsafe(
        `UPDATE notification
         SET ${updateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        ...values
    );

    const [updated] = await prisma.$queryRawUnsafe(
        `SELECT id, userId, title, message, \`read\`, createdAt, updatedAt
         FROM notification
         WHERE id = ?`,
        notificationId
    );

    return mapNotification(updated);
};

const deleteNotification = async ({ currentUser, notificationId }) => {
    await ensureNotificationTable();
    const [existing] = await prisma.$queryRawUnsafe(
        `SELECT id, userId FROM notification WHERE id = ?`,
        notificationId
    );

    if (!existing) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Notification not found.');
    }

    if (currentUser.role !== ROLES.ADMIN && existing.userId !== currentUser.id) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Not allowed to delete this notification.');
    }

    await prisma.$executeRawUnsafe(
        `DELETE FROM notification WHERE id = ?`,
        notificationId
    );
};

const clearNotifications = async ({ currentUser, userId }) => {
    await ensureNotificationTable();
    const effectiveUserId = currentUser.role === ROLES.ADMIN && userId ? userId : currentUser.id;

    const result = await prisma.$executeRawUnsafe(
        `DELETE FROM notification WHERE userId = ?`,
        effectiveUserId
    );

    return { deleted: Number(result) || 0 };
};

const registerPushToken = async ({ currentUser, body }) => {
    await ensurePushTokenTable();

    const rawToken = typeof body?.token === 'string' ? body.token : '';
    const token = rawToken.trim();
    if (!isExpoPushToken(token)) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid Expo push token.');
    }

    const platform = typeof body?.platform === 'string'
        ? body.platform.trim().toLowerCase()
        : null;

    await prisma.$executeRawUnsafe(
        `INSERT INTO notification_push_token (id, userId, token, platform, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
         ON DUPLICATE KEY UPDATE
            userId = VALUES(userId),
            platform = VALUES(platform),
            updatedAt = CURRENT_TIMESTAMP(3)`,
        randomUUID(),
        currentUser.id,
        token,
        platform
    );

    return {
        userId: currentUser.id,
        token,
        platform,
    };
};

const removePushToken = async ({ currentUser, body }) => {
    await ensurePushTokenTable();

    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    let deleted;

    if (token) {
        deleted = await prisma.$executeRawUnsafe(
            `DELETE FROM notification_push_token WHERE userId = ? AND token = ?`,
            currentUser.id,
            token
        );
    } else {
        deleted = await prisma.$executeRawUnsafe(
            `DELETE FROM notification_push_token WHERE userId = ?`,
            currentUser.id
        );
    }

    return { deleted: Number(deleted) || 0 };
};

const sendTestPushNotification = async ({ currentUser, body }) => {
    const timestamp = new Date().toLocaleString();
    const title = body?.title?.trim() || 'Test Push Notification';
    const message = body?.message?.trim()
        || `Push notifications are working for your ${String(currentUser.role || 'user').toLowerCase()} account. Triggered at ${timestamp}.`;

    const notification = await createNotificationRecord({
        userId: currentUser.id,
        title,
        message,
    });

    return {
        queued: true,
        notification,
    };
};

module.exports = {
    listNotifications,
    createNotification,
    createSystemNotification,
    createSystemRoleNotification,
    updateNotification,
    deleteNotification,
    clearNotifications,
    registerPushToken,
    removePushToken,
    sendTestPushNotification,
};
