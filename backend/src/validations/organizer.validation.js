const { customJoi, basePaginationQuery } = require('./custom.validation');

const searchUsers = customJoi.object({
    query: basePaginationQuery.keys({
        email: customJoi.string().email().optional(),
        name: customJoi.string().optional(),
    }),
});

module.exports = {
    searchUsers,
};

