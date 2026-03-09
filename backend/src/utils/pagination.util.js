const { app } = require('../configs/index.config');
const { ApiError } = require('./error.util');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/index.constants');

const getPagination = (query) => {
    const page = Math.abs(parseInt(query.page, 10)) || app.pagination.defaultPage;
    let pageSize =
        Math.abs(parseInt(query.pageSize, 10)) || app.pagination.defaultPageSize;

    if (pageSize > app.pagination.maxPageSize) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            ERROR_MESSAGES.PAGINATION_MAX_EXCEEDED,
            'PAGINATION_LIMIT_EXCEEDED',
            `Page size must be ${app.pagination.maxPageSize} or less.`
        );
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    return { skip, take, page, pageSize };
};

const createPaginatedResponse = (data, totalItems, page, pageSize) => {
    const totalPages = Math.ceil(totalItems / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
        data,
        meta: {
            totalItems,
            itemCount: data.length,
            itemsPerPage: pageSize,
            currentPage: page,
            totalPages,
            hasNextPage,
            hasPrevPage,
        },
    };
};

module.exports = {
    getPagination,
    createPaginatedResponse,
};
