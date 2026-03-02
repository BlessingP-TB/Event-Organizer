const { customJoi, uuidParam } = require('./custom.validation');
const { ROLES } = require('../constants/index.constants');

const adminUpdateUser = uuidParam('id').keys({
    body: customJoi.object({
        email: customJoi.string().email().optional(),
        name: customJoi.string().optional(),
        role: customJoi.string().valid(...Object.values(ROLES)).optional(),
        active: customJoi.boolean().optional(),
    }),
});

const listUsers = {
  query: customJoi.object({
    // Search
    query: customJoi.string().allow(''),

    // Filter — allow "all" in addition to valid roles
    role: customJoi.string().valid('all', ...Object.values(ROLES)),

    // Pagination
    page: customJoi.number().integer().min(1).default(1),
    pageSize: customJoi.number().integer().min(1).max(100).default(10),

    // Sorting
    sortBy: customJoi.string().default('createdAt:desc'),
  }),
};
module.exports = {
    listUsers,
    adminUpdateUser,
};
