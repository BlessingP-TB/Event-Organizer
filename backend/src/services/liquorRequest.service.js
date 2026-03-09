const { prisma, ApiError } = require('../utils/index.util');
const {
    HTTP_STATUS,
    APPROVAL_TYPE,
    APPROVAL_STATUS,
    ROLES,
    ERROR_MESSAGES,
} = require('../constants/index.constants');
const eventService = require('./event.service');

const createLiquorRequest = async (eventId, requestBody, organizerId) => {
    const event = await eventService.getEventById(eventId);
    if (event.organizerId !== organizerId) {
        throw new ApiError(
            HTTP_STATUS.FORBIDDEN,
            'You are not the organizer of this event.'
        );
    }

    const existingRequest = await prisma.liquorRequest.findFirst({
        where: { eventId },
    });
    if (existingRequest) {
        throw new ApiError(
            HTTP_STATUS.CONFLICT,
            'A liquor request already exists for this event.'
        );
    }

    return prisma.$transaction(async (tx) => {
        const approval = await tx.approval.create({
            data: {
                targetType: 'Event',
                targetId: eventId,
                type: APPROVAL_TYPE.LIQUOR,
                status: APPROVAL_STATUS.PENDING,
                notes: 'Pending organizer liquor request.',
            },
        });

        const liquorRequest = await tx.liquorRequest.create({
            data: {
                eventId,
                startTime: requestBody.startTime,
                endTime: requestBody.endTime,
                policyAgreed: requestBody.policyAgreed,
                approvalId: approval.id,
            },
        });

        return liquorRequest;
    });
};

const getLiquorRequestById = async (id) => {
    const liquorRequest = await prisma.liquorRequest.findUnique({
        where: { id },
        include: { approval: true },
    });
    if (!liquorRequest) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Liquor request not found.');
    }
    return liquorRequest;
};

const getLiquorRequestByEventId = async (eventId) => {
    const liquorRequest = await prisma.liquorRequest.findFirst({
        where: { eventId },
        include: { approval: true },
    });
    if (!liquorRequest) {
        throw new ApiError(
            HTTP_STATUS.NOT_FOUND,
            'No liquor request found for this event.'
        );
    }
    return liquorRequest;
};

const updateLiquorRequest = async (id, updateBody, user) => {
    const liquorRequest = await getLiquorRequestById(id);

    if (
        liquorRequest.approval.status === APPROVAL_STATUS.APPROVED ||
        liquorRequest.approval.status === APPROVAL_STATUS.REJECTED
    ) {
        throw new ApiError(
            HTTP_STATUS.FORBIDDEN,
            'Cannot update a request that has already been processed.'
        );
    }

    if (user.role === ROLES.ORGANIZER) {
        const event = await eventService.getEventById(liquorRequest.eventId);
        if (event.organizerId !== user.id) {
            throw new ApiError(
                HTTP_STATUS.FORBIDDEN,
                ERROR_MESSAGES.FORBIDDEN,
                'NOT_EVENT_ORGANIZER'
            );
        }
    }

    return prisma.liquorRequest.update({
        where: { id },
        data: {
            ...updateBody,
        },
    });
};

module.exports = {
    createLiquorRequest,
    getLiquorRequestById,
    getLiquorRequestByEventId,
    updateLiquorRequest,
};

