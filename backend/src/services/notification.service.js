const { prisma, ApiError } = require('../utils/index.util');
const { HTTP_STATUS, ROLES } = require('../constants/index.constants');
const { randomUUID } = require('crypto');

let tableInitialized = false;

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

    return mapNotification(created);
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

        return createdItems;
    }

    const targetUserId = userId || currentUser.id;
    return createNotificationRecord({ userId: targetUserId, title, message });
};

const createSystemNotification = async ({ userId, title, message, tx }) => {
    return createNotificationRecord({ userId, title, message }, tx || prisma);
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

module.exports = {
    listNotifications,
    createNotification,
    createSystemNotification,
    updateNotification,
    deleteNotification,
    clearNotifications,
};
