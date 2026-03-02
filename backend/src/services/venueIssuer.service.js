const {
    prisma,
    ApiError,
    getPagination,
    createPaginatedResponse,
    logger,
} = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');
const { storage } = require('../configs/environment.config');
const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

const uploadLogoToBlob = async (logoBase64, mimetype = 'image/png') => {
    if (storage.strategy !== 'BLOB') {
        throw new ApiError(
            HTTP_STATUS.NOT_IMPLEMENTED,
            'Blob storage is not enabled.'
        );
    }
    try {
        const buffer = Buffer.from(logoBase64, 'base64');
        const blobServiceClient = BlobServiceClient.fromConnectionString(
            storage.blob.connectionString
        );
        const containerClient = blobServiceClient.getContainerClient(
            storage.blob.containerName
        );
        const blobName = `${uuidv4()}-issuer-logo.png`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadData(buffer, {
            blobHTTPHeaders: { blobContentType: mimetype },
        });
        return blockBlobClient.url;
    } catch (error) {
        logger.error('Failed to upload issuer logo to blob storage', error);
        throw new ApiError(
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            'Failed to store logo.'
        );
    }
};

const createVenueIssuer = async (issuerBody) => {
    const {
        institutionName,
        institutionAddress,
        institutionLogo,
        otherDetails,
    } = issuerBody;

    let institutionLogoUrl = null;
    let institutionLogoBytes = null;

    if (institutionLogo) {
        if (storage.strategy === 'BLOB') {
            institutionLogoUrl = await uploadLogoToBlob(institutionLogo);
        } else if (storage.strategy === 'DB') {
            institutionLogoBytes = Buffer.from(institutionLogo, 'base64');
        } else {
            throw new ApiError(
                HTTP_STATUS.NOT_IMPLEMENTED,
                'Invalid or unsupported storage strategy.'
            );
        }
    }

    return prisma.venueIssuer.create({
        data: {
            institutionName,
            institutionAddress,
            otherDetails,
            institutionLogoUrl,
            institutionLogo: institutionLogoBytes,
        },
    });
};

const listVenueIssuers = async (queryOptions) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const query = {
        skip,
        take,
        orderBy: { institutionName: 'asc' },
        select: {
            id: true,
            institutionName: true,
            institutionAddress: true,
            institutionLogoUrl: true,
            otherDetails: true,
        },
    };

    const [issuers, totalItems] = await prisma.$transaction([
        prisma.venueIssuer.findMany(query),
        prisma.venueIssuer.count({ where: query.where }),
    ]);

    return createPaginatedResponse(issuers, totalItems, page, pageSize);
};

const getVenueIssuerById = async (id) => {
    const issuer = await prisma.venueIssuer.findUnique({
        where: { id },
    });
    if (!issuer) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Venue Issuer not found.');
    }
    return issuer;
};

const updateVenueIssuer = async (id, updateBody) => {
    const {
        institutionName,
        institutionAddress,
        institutionLogo,
        otherDetails,
    } = updateBody;

    const data = {
        institutionName,
        institutionAddress,
        otherDetails,
    };

    if (institutionLogo) {
        if (storage.strategy === 'BLOB') {
            data.institutionLogoUrl = await uploadLogoToBlob(institutionLogo);
            data.institutionLogo = null;
        } else if (storage.strategy === 'DB') {
            data.institutionLogo = Buffer.from(institutionLogo, 'base64');
            data.institutionLogoUrl = null;
        } else {
            throw new ApiError(
                HTTP_STATUS.NOT_IMPLEMENTED,
                'Invalid or unsupported storage strategy.'
            );
        }
    }

    try {
        return await prisma.venueIssuer.update({
            where: { id },
            data,
        });
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ApiError(
                HTTP_STATUS.NOT_FOUND,
                'Venue Issuer not found.'
            );
        }
        throw error;
    }
};

const deleteVenueIssuer = async (id) => {
    try {
        await prisma.venueIssuer.delete({
            where: { id },
        });
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ApiError(
                HTTP_STATUS.NOT_FOUND,
                'Venue Issuer not found.'
            );
        }
        throw error;
    }
};

module.exports = {
    createVenueIssuer,
    listVenueIssuers,
    getVenueIssuerById,
    updateVenueIssuer,
    deleteVenueIssuer,
};