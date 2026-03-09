const { approvalService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const listApprovals = catchAsync(async (req, res) => {
    const paginatedResult = await approvalService.listApprovals(req.query);
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const getApproval = catchAsync(async (req, res) => {
    const approval = await approvalService.getApprovalById(req.params.id);
    res.status(HTTP_STATUS.OK).send(approval);
});

const updateApproval = catchAsync(async (req, res) => {
    const approval = await approvalService.updateApprovalStatus(
        req.params.id,
        req.user.id,
        req.body
    );
    res.status(HTTP_STATUS.OK).send(approval);
});
/*
const updateApproval = catchAsync(async (req, res) => {

    // -----------------------------------------------------------------
    // TEMPORARY FIX: Provide a dummy ID when authentication is bypassed
    // -----------------------------------------------------------------
    // Assuming the user ID is needed in the updateApprovalStatus service call
    const adminId = req.user?.id || 'd5b376ad-13ef-4b59-abaa-f601083f83c6';

    const approval = await approvalService.updateApprovalStatus(
        req.params.id, // Assuming the route is /:id, NOT /:approval_id (Based on prior fix recommendation)
        adminId,      // Pass the Admin ID to the service
        req.body
    );
    res.status(HTTP_STATUS.OK).send(approval);
});

*/
module.exports = {
    listApprovals,
    getApproval,
    updateApproval,
};

