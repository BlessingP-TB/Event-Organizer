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

const createEventApproval = async (eventId, adminId, approvalBody) => {
    const { type, status, notes } = approvalBody;

    // Use a transaction to ensure both the Approval is created AND the Event status is updated
    return prisma.$transaction(async (tx) => {
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

        if (status === APPROVAL_STATUS.APPROVED) {
            newEventStatus = EVENT_STATUS.PUBLISHED;
        } else if (status === APPROVAL_STATUS.REJECTED) {
            // If rejected, we mark the event as CANCELLED (or you could stick to DRAFT/REJECTED depending on your flow)
            newEventStatus = EVENT_STATUS.CANCELLED;
        }

        if (newEventStatus) {
            await tx.event.update({
                where: { id: eventId },
                data: { status: newEventStatus },
            });
        }

        return approval;
    });
};

const listApprovals = async (queryOptions) => {
    const { status = APPROVAL_STATUS.PENDING } = queryOptions;
    const { skip, take, page, pageSize } = getPagination(queryOptions);

    const whereClause = { status };

    const query = {
        where: whereClause,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: {
            approver: { select: { id: true, name: true } },
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

const updateApprovalStatus = async (approvalId, adminId, updateBody) => {
  const { status, notes } = updateBody;
  return prisma.$transaction(async (tx) => {
    // 1. Update approval
    const updatedApproval = await tx.approval.update({
      where: { id: approvalId },
      data: {
        status,
        notes,
        approverId: adminId,
        updatedAt: new Date(),
      },
      include: { event: true }
    });

    // 2. If event exists, update its status
    if (updatedApproval.eventId) {
      let newEventStatus = null;
      if (status === APPROVAL_STATUS.APPROVED) {
        newEventStatus = EVENT_STATUS.PUBLISHED;
      } else if (status === APPROVAL_STATUS.REJECTED) {
        newEventStatus = EVENT_STATUS.CANCELLED;
      }

      if (newEventStatus) {
        await tx.event.update({
          where: { id: updatedApproval.eventId },
          data: { status: newEventStatus }
        });
      }
    }

    return updatedApproval;
  });
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

module.exports = {
    createEventApproval,
    listApprovals,
    getApprovalById,
    updateApprovalStatus,
    approveImmediateBooking,
};