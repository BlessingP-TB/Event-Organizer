// src/services/theme.service.js
const { prisma, ApiError, getPagination, createPaginatedResponse, logger } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');
const { storage } = require('../configs/environment.config');
const { blobUtil} = require('../utils/index.util');

const uploadImageToBlob = async (imageBase64, mimetype = 'image/png') => {
    if (storage.strategy !== 'BLOB') {
        throw new ApiError(HTTP_STATUS.NOT_IMPLEMENTED, 'Blob storage is not enabled.');
    }
    try {
        const buffer = Buffer.from(imageBase64, 'base64');
        const { url } = await blobUtil.uploadBuffer(buffer, 'theme-image.png', mimetype);
        return url;
    } catch (error) {
        logger.error('Failed to upload theme image to blob storage', error);
        throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to store image.');
    }
};

// src/services/theme.service.js
const createTheme = async (themeBody) => {
  const { name, description, image, eventId } = themeBody;
  let imageUrl = null;
  let imageBytes = null;

  if (image) {
    if (storage.strategy === 'BLOB') {
      imageUrl = await uploadImageToBlob(image);
    } else if (storage.strategy === 'DB') {
      imageBytes = Buffer.from(image, 'base64');
    } else {
      throw new ApiError(HTTP_STATUS.NOT_IMPLEMENTED, 'Invalid or unsupported storage strategy.');
    }
  }

  return prisma.$transaction(async (tx) => {
    // 1. Create the theme
    const theme = await tx.theme.create({
      data: {
        name,
        description,
        imageUrl,
        image: imageBytes,
      },
    });

    // 2. If eventId is provided, link it by updating the Event
    if (eventId) {
      // Optional: verify event exists (and user owns it) for security
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { id: true },
      });
      if (!event) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Event not found.');
      }

      await tx.event.update({
        where: { id: eventId },
        data: { themeId: theme.id },
      });
    }

    return theme;
  });
};

const listThemes = async (queryOptions) => {
    const { name } = queryOptions;
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const whereClause = {};
    if (name) {
        whereClause.name = { contains: name };
    }
    const query = {
        skip,
        take,
        where: whereClause,
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            createdAt: true,
            updatedAt: true,
            events: {
                select: {
                    id: true // Include associated event IDs if needed
                }
            }
        }
    };
    const [themes, totalItems] = await prisma.$transaction([prisma.theme.findMany(query), prisma.theme.count({ where: query.where })]);
    return createPaginatedResponse(themes, totalItems, page, pageSize);
};

const getThemeById = async (themeId) => {
    const theme = await prisma.theme.findUnique({ 
        where: { id: themeId },
        include: {
            events: {
                select: {
                    id: true
                }
            }
        }
    });
    if (!theme) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Theme not found.');
    }
    return theme;
};

const updateTheme = async (themeId, updateBody) => {
    const { name, description, image, eventId } = updateBody;
    const data = { name, description };
    
    if (image) {
        if (storage.strategy === 'BLOB') {
            data.imageUrl = await uploadImageToBlob(image);
            data.image = null;
        } else if (storage.strategy === 'DB') {
            data.image = Buffer.from(image, 'base64');
            data.imageUrl = null;
        } else {
            throw new ApiError(HTTP_STATUS.NOT_IMPLEMENTED, 'Invalid or unsupported storage strategy.');
        }
    }
    
    // Handle event association
    if (eventId !== undefined) {
        if (eventId) {
            // Connect to the specified event
            data.events = { connect: { id: eventId } };
        } else {
            // Disconnect from any event (set to null)
            data.events = { disconnect: true };
        }
    }
    
    try {
        return await prisma.theme.update({ where: { id: themeId }, data });
    } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
            throw new ApiError(HTTP_STATUS.CONFLICT, 'A theme with this name already exists.', 'THEME_NAME_CONFLICT');
        }
        if (error.code === 'P2025') {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Theme not found.');
        }
        throw error;
    }
};

const deleteTheme = async (themeId) => {
    try {
        await prisma.theme.delete({ where: { id: themeId } });
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Theme not found.');
        }
        throw error;
    }
};



module.exports = {
    createTheme,
    listThemes,
    getThemeById,
    updateTheme,
    deleteTheme,
    
};