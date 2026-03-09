const safeUserSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    address: true,
    cellphone_number: true,
    createdAt: true,
    updatedAt: true,
    active: true,
    account: {
        select: {
            emailVerified: true,
        },
    },
};

const safeAdminUserSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    address: true,
    cellphone_number: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
    active: true,
    account: {
        select: {
            emailVerified: true,
            failedLoginAttempts: true,
            lockedAt: true,
            createdAt: true,
        },
    },
    organizerProfile: true,
    documents: {
        select: {
            id: true,
            type: true,
            filename: true,
            status: true,
            submittedAt: true,
        },
    },
};

module.exports = {
    safeUserSelect,
    safeAdminUserSelect,
};
