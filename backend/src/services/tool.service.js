const {
    prisma,
    ApiError,
    getPagination,
    createPaginatedResponse,
} = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const createTool = async (toolBody) => {
    try {
        return await prisma.tool.create({
            data: toolBody,
        });
    } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
            throw new ApiError(
                HTTP_STATUS.CONFLICT,
                'A tool with this name already exists.',
                'TOOL_NAME_CONFLICT'
            );
        }
        throw error;
    }
};

const listTools = async () => {
    return prisma.tool.findMany({
        where: { active: true },
    });
};

const listAllTools = async (queryOptions) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const query = {
        skip,
        take,
        orderBy: { createdAt: 'desc' },
    };

    const [tools, totalItems] = await prisma.$transaction([
        prisma.tool.findMany(query),
        prisma.tool.count({ where: query.where }),
    ]);

    return createPaginatedResponse(tools, totalItems, page, pageSize);
};

const getToolById = async (toolId) => {
    const tool = await prisma.tool.findUnique({
        where: { id: toolId },
    });
    if (!tool) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Tool not found.');
    }
    return tool;
};

const updateTool = async (toolId, updateBody) => {
    try {
        return await prisma.tool.update({
            where: { id: toolId },
            data: updateBody,
        });
    } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
            throw new ApiError(
                HTTP_STATUS.CONFLICT,
                'A tool with this name already exists.',
                'TOOL_NAME_CONFLICT'
            );
        }
        if (error.code === 'P2025') {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Tool not found.');
        }
        throw error;
    }
};

const deleteTool = async (toolId) => {
    try {
        await prisma.tool.delete({
            where: { id: toolId },
        });
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Tool not found.');
        }
        throw error;
    }
};

module.exports = {
    createTool,
    listTools,
    listAllTools,
    getToolById,
    updateTool,
    deleteTool,
};