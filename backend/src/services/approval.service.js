// src/services/approval.service.js
const {
    prisma,
    ApiError,
    getPagination,
    createPaginatedResponse,
} = require('../utils/index.util');
const {
    HTTP_STATUS,
    APPROVAL_STATUS,
    EVENT_STATUS,
} = require('../constants/index.constants');
const eventService = require('./event.service');
const notificationService = require('./notification.service');

const createEventApproval = async (eventId, adminId, approvalBody) => {
    const { type, status, notes } = approvalBody;

    // Use a transaction to ensure both the Approval is created AND the Event status is updated
    return prisma.$transaction(async (tx) => {
        // Fetch the event to get organizer info
        const event = await tx.event.findUnique({ where: { id: eventId } });
        if (!event) {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Event not found.');
        }

        // 1. Create the approval record
        const approval = await tx.approval.create({
            data: {
                targetType: 'Event',
                targetId: eventId,
                // Connect the admin user correctly
                approver: { connect: { id: adminId } },
                type,
                status,
                notes,
                event: { connect: { id: eventId } },
            },
        });

        // 2. Automatically update the Event status based on the Approval decision
        let newEventStatus = null;
        let notificationTitle = '';
        let notificationMessage = '';

        if (status === APPROVAL_STATUS.APPROVED) {
            newEventStatus = EVENT_STATUS.PUBLISHED;
            notificationTitle = 'Event Approved';
            notificationMessage = `Your event "${event.name}" has been approved and is now published.`;
        } else if (status === APPROVAL_STATUS.REJECTED) {
            newEventStatus = EVENT_STATUS.CANCELLED;
            notificationTitle = 'Event Rejected';
            notificationMessage = `Your event "${event.name}" has been rejected.${notes ? ` Reason: ${notes}` : ''}`;
        }

        if (newEventStatus) {
            await tx.event.update({
                where: { id: eventId },
                data: { status: newEventStatus },
            });
        }

        // 3. Notify the organizer
        if (notificationTitle) {
            await notificationService.createSystemNotification({
                userId: event.organizerId,
                title: notificationTitle,
                message: notificationMessage,
                tx,
            });
        }

        return approval;
    });
};

const listApprovals = async (queryOptions) => {
    const { status } = queryOptions;
    const { skip, take, page, pageSize } = getPagination(queryOptions);

    const whereClause = {};
    const normalizedStatus =
        typeof status === 'string' ? status.toUpperCase() : undefined;

    if (
        normalizedStatus &&
        normalizedStatus !== 'ALL' &&
        Object.values(APPROVAL_STATUS).includes(normalizedStatus)
    ) {
        whereClause.status = normalizedStatus;
    }

    const query = {
        where: whereClause,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
            approver: { select: { id: true, name: true } },
            event: {
                select: {
                    id: true,
                    name: true,
                    startDateTime: true,
                    venue: { select: { name: true } },
                    organizer: { select: { name: true } },
                },
            },
        },
    };

    const [approvals, totalItems] = await prisma.$transaction([
        prisma.approval.findMany(query),
        prisma.approval.count({ where: query.where }),
    ]);

    return createPaginatedResponse(approvals, totalItems, page, pageSize);
};

const getApprovalById = async (approvalId) => {
    const approval = await prisma.approval.findUnique({
        where: { id: approvalId },
    });
    if (!approval) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Approval record not found.');
    }
    return approval;
};

const approveImmediateBooking = async (eventId, adminId, reason) => {
    const event = await eventService.getEventById(eventId);
    await eventService.checkVenueAvailability(
        event.venueId,
        event.startDateTime,
        event.endDateTime,
        eventId
    );

    return eventService.setEventStatus(
        eventId,
        EVENT_STATUS.PUBLISHED,
        adminId,
        reason
    );
};

const parseApprovalNotes = (notes) => {
    if (typeof notes !== 'string') {
        return null;
    }

    try {
        return JSON.parse(notes);
    } catch (error) {
        return null;
    }
};

const getReschedulePayloadValue = (payload, legacyKey, compactKey) => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    return payload[legacyKey] ?? payload[compactKey] ?? null;
};

const updateApprovalStatus = async (approvalId, adminId, updateBody) => {
    const { status, notes } = updateBody;

    return prisma.$transaction(async (tx) => {
        const approval = await tx.approval.findUnique({
            where: { id: approvalId },
            include: { event: true },
        });

        if (!approval) {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Approval record not found.');
        }

        const event = approval.event;

        const payload = parseApprovalNotes(approval.notes) || {};

        const updatedApproval = await tx.approval.update({
            where: { id: approvalId },
            data: {
                status,
                notes: notes ?? approval.notes,
                approverId: adminId,
                updatedAt: new Date(),
            },
            include: { event: true },
        });

        if (event) {
            if (approval.targetType === 'EventReschedule') {
                const requestedVenueId =
                    getReschedulePayloadValue(payload, 'requestedVenueId', 'v') || event.venueId;
                const requestedStartDateTime = getReschedulePayloadValue(
                    payload,
                    'requestedStartDateTime',
                    's'
                )
                    ? new Date(getReschedulePayloadValue(payload, 'requestedStartDateTime', 's'))
                    : null;
                const requestedEndDateTime = getReschedulePayloadValue(
                    payload,
                    'requestedEndDateTime',
                    'e'
                )
                    ? new Date(getReschedulePayloadValue(payload, 'requestedEndDateTime', 'e'))
                    : null;

                if (status === APPROVAL_STATUS.APPROVED) {
                    if (!requestedStartDateTime || !requestedEndDateTime) {
                        throw new ApiError(
                            HTTP_STATUS.BAD_REQUEST,
                            'Reschedule payload is missing requested date range.'
                        );
                    }

                    await eventService.checkVenueAvailability(
                        requestedVenueId,
                        requestedStartDateTime,
                        requestedEndDateTime,
                        event.id,
                        tx
                    );

                    await tx.event.update({
                        where: { id: event.id },
                        data: {
                            venueId: requestedVenueId,
                            startDateTime: requestedStartDateTime,
                            endDateTime: requestedEndDateTime,
                            status: EVENT_STATUS.PUBLISHED,
                        },
                    });

                    await notificationService.createSystemNotification({
                        userId: event.organizerId,
                        title: 'Reschedule Approved',
                        message: `Your reschedule request for "${event.name}" has been approved.`,
                        tx,
                    });
                }

                if (status === APPROVAL_STATUS.REJECTED) {
                    await tx.event.update({
                        where: { id: event.id },
                        data: {
                            status: getReschedulePayloadValue(
                                payload,
                                'previousStatus',
                                'p'
                            ) || EVENT_STATUS.PUBLISHED,
                        },
                    });

                    await notificationService.createSystemNotification({
                        userId: event.organizerId,
                        title: 'Reschedule Rejected',
                        message: `Your reschedule request for "${event.name}" was rejected.${notes ? ` Reason: ${notes}` : ''}`,
                        tx,
                    });
                }
            } else {
                let newEventStatus = null;
                let notificationTitle = '';
                let notificationMessage = '';

                if (status === APPROVAL_STATUS.APPROVED) {
                    newEventStatus = EVENT_STATUS.PUBLISHED;
                    notificationTitle = 'Event Approved';
                    notificationMessage = `Your event "${event.name}" has been approved and is now published.`;
                } else if (status === APPROVAL_STATUS.REJECTED) {
                    newEventStatus = EVENT_STATUS.CANCELLED;
                    notificationTitle = 'Event Rejected';
                    notificationMessage = `Your event "${event.name}" has been rejected.${notes ? ` Reason: ${notes}` : ''}`;
                }

                if (newEventStatus) {
                    await tx.event.update({
                        where: { id: event.id },
                        data: { status: newEventStatus },
                    });
                }

                if (notificationTitle && event.organizerId) {
                    await notificationService.createSystemNotification({
                        userId: event.organizerId,
                        title: notificationTitle,
                        message: notificationMessage,
                        tx,
                    });
                }
            }

            await notificationService.createSystemNotification({
                userId: event.organizerId,
                title: 'Approval Status Updated',
                message: `Your event "${event.name}" approval is now ${status}.`,
                tx,
            });
        }

        return updatedApproval;
    });
};

module.exports = {
    createEventApproval,
    listApprovals,
    getApprovalById,
    updateApprovalStatus,
    approveImmediateBooking,
};