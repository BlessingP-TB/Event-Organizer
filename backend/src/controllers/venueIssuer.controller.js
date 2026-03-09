const { venueIssuerService } = require('../services/index.service');
const { catchAsync } = require('../utils/index.util');
const { HTTP_STATUS } = require('../constants/index.constants');

const createVenueIssuer = catchAsync(async (req, res) => {
    const issuer = await venueIssuerService.createVenueIssuer(req.body);
    res.status(HTTP_STATUS.CREATED).send(issuer);
});

const listVenueIssuers = catchAsync(async (req, res) => {
    const paginatedResult = await venueIssuerService.listVenueIssuers(req.query);
    res.status(HTTP_STATUS.OK).send(paginatedResult);
});

const getVenueIssuer = catchAsync(async (req, res) => {
    const issuer = await venueIssuerService.getVenueIssuerById(req.params.id);
    res.status(HTTP_STATUS.OK).send(issuer);
});

const updateVenueIssuer = catchAsync(async (req, res) => {
    const issuer = await venueIssuerService.updateVenueIssuer(
        req.params.id,
        req.body
    );
    res.status(HTTP_STATUS.OK).send(issuer);
});

const deleteVenueIssuer = catchAsync(async (req, res) => {
    await venueIssuerService.deleteVenueIssuer(req.params.id);
    res.status(HTTP_STATUS.NO_CONTENT).send();
});

module.exports = {
    createVenueIssuer,
    listVenueIssuers,
    getVenueIssuer,
    updateVenueIssuer,
    deleteVenueIssuer,
};