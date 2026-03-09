const {
    prisma,
    ApiError,
    getPagination,
    createPaginatedResponse,
} = require('../utils/index.util');
const {
    HTTP_STATUS,
    ROLES,
    APPROVAL_STATUS,
    APPROVAL_TYPE,
} = require('../constants/index.constants');

const requestOrganizerUpgrade = async (userId, upgradeBody) => {
    const { companyName, website, notes, cellphone_number } = upgradeBody;

    const existingProfile = await prisma.organizerProfile.findFirst({
        where: { userId },
    });

    if (existingProfile) {
        throw new ApiError(
            HTTP_STATUS.CONFLICT,
            'An organizer profile or request already exists for this user.',
            'PROFILE_CONFLICT'
        );
    }

    const profileNotes = `Upgrade request: ${companyName}${website ? ` (${website})` : ''}. ${notes || ''}`;

    return prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: userId },
            data: { cellphone_number },
        });

        const profile = await tx.organizerProfile.create({
            data: {
                userId,
                verified: false,
            },
        });

        await tx.approval.create({
            data: {
                targetType: 'OrganizerProfile',
                targetId: profile.id,
                organizerProfileId: profile.id,
                type: APPROVAL_TYPE.ORGANIZER_DOC,
                status: APPROVAL_STATUS.PENDING,
                notes: profileNotes,
            },
        });

        return profile;
    });
};

const getOrganizerProfile = async (userId) => {
    return prisma.organizerProfile.findFirst({
        where: { userId },
        include: {
            uploadedDocs: true,
            approvals: true,
        },
    });
};

const createOrUpdateOrganizerProfile = async (userId, profileBody) => {
    const { companyName, website } = profileBody;
    const notes = `Profile update: ${companyName}${website ? ` (${website})` : ''}`;

    const profile = await prisma.organizerProfile.upsert({
        where: { userId },
        create: {
            userId,
        },
        update: {},
    });

    await prisma.approval.create({
        data: {
            targetType: 'OrganizerProfile',
            targetId: profile.id,
            organizerProfileId: profile.id,
            type: APPROVAL_TYPE.GENERAL,
            status: APPROVAL_STATUS.PENDING,
            notes,
        },
    });

    return prisma.organizerProfile.findUnique({
        where: { id: profile.id },
        include: { uploadedDocs: true, approvals: true },
    });
};

const listOrganizerProfiles = async (queryOptions) => {
    const { skip, take, page, pageSize } = getPagination(queryOptions);
    const query = {
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    };

    const [profiles, totalItems] = await prisma.$transaction([
        prisma.organizerProfile.findMany(query),
        prisma.organizerProfile.count({ where: query.where }),
    ]);

    return createPaginatedResponse(profiles, totalItems, page, pageSize);
};

const verifyOrganizerProfile = async (
    profileId,
    { verified, promoteUser },
    adminId
) => {
    const profile = await prisma.organizerProfile.findUnique({
        where: { id: profileId },
    });

    if (!profile) {
        throw new ApiError(
            HTTP_STATUS.NOT_FOUND,
            'Organizer profile not found.'
        );
    }

    const updateData = {
        verified,
        verifiedByAdminId: adminId,
        verifiedAt: verified ? new Date() : null,
    };

    const transactions = [
        prisma.organizerProfile.update({
            where: { id: profileId },
            data: updateData,
        }),
    ];

    if (verified && promoteUser) {
        transactions.push(
            prisma.user.update({
                where: { id: profile.userId },
                data: { role: ROLES.ORGANIZER },
            })
        );
    }

    const transactionResults = await prisma.$transaction(transactions);
    const updatedProfile = transactionResults[0];

    return updatedProfile;
};

const searchUsers = async (queryOptions) => {
    const { email, name } = queryOptions;
    const { skip, take, page, pageSize } = getPagination(queryOptions);

    if (!email && !name) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            'A search parameter (email or name) is required.'
        );
    }

    const whereClause = {
        deletedAt: null,
        role: ROLES.ATTENDEE,
        OR: [],
    };

    if (email) {
        whereClause.OR.push({ email: { contains: email } });
    }
    if (name) {
        whereClause.OR.push({ name: { contains: name } });
    }

    const query = {
        skip,
        take,
        where: whereClause,
        orderBy: { name: 'asc' },
        select: {
            id: true,
            email: true,
            name: true,
        },
    };

    const [users, totalItems] = await prisma.$transaction([
        prisma.user.findMany(query),
        prisma.user.count({ where: query.where }),
    ]);

    return createPaginatedResponse(users, totalItems, page, pageSize);
};

module.exports = {
    requestOrganizerUpgrade,
    getOrganizerProfile,
    createOrUpdateOrganizerProfile,
    listOrganizerProfiles,
    verifyOrganizerProfile,
    searchUsers,
};