const { prisma, ApiError } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');
const { randomUUID } = require('crypto');

let tableInitialized = false;

const ensureRatingTable = async () => {
    if (tableInitialized) return;

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS rating (
            id VARCHAR(36) NOT NULL,
            userId VARCHAR(191) NOT NULL,
            eventId VARCHAR(36) NOT NULL,
            rating INT NOT NULL,
            comments TEXT,
            categories JSON,
            createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (id),
            UNIQUE INDEX rating_user_event_idx (userId, eventId)
        );
    `);

    tableInitialized = true;
};

const createRating = async ({ currentUser, body }) => {
    await ensureRatingTable();

    const { eventId, rating, comments, categories } = body;

    if (!eventId) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'eventId is required.');
    }

    // Check if user already rated this event
    const [existing] = await prisma.$queryRawUnsafe(
        `SELECT id FROM rating WHERE userId = ? AND eventId = ?`,
        currentUser.id,
        eventId
    );

    if (existing) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'You have already rated this event.');
    }

    const newId = randomUUID();
    await prisma.$executeRawUnsafe(
        `INSERT INTO rating (id, userId, eventId, rating, comments, categories, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
        newId,
        currentUser.id,
        eventId,
        rating,
        comments || '',
        JSON.stringify(categories || [])
    );

    return {
        id: newId,
        userId: currentUser.id,
        eventId,
        rating,
        comments: comments || '',
        categories: categories || [],
    };
};

const getEventRatings = async (eventId) => {
    await ensureRatingTable();

    const rows = await prisma.$queryRawUnsafe(
        `SELECT id, userId, eventId, rating, comments, categories, createdAt
         FROM rating WHERE eventId = ? ORDER BY createdAt DESC`,
        eventId
    );

    return rows.map((r) => ({
        ...r,
        categories: typeof r.categories === 'string' ? JSON.parse(r.categories) : r.categories,
    }));
};

module.exports = {
    createRating,
    getEventRatings,
};
