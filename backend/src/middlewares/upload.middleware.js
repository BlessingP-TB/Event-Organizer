const multer = require('multer');
const { ApiError } = require('../utils/index.util');
const { app: appConfig } = require('../configs/index.config');
const { HTTP_STATUS } = require('../constants/index.constants');

const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (!appConfig.uploads.enabled) {
            return cb(
                new ApiError(
                    HTTP_STATUS.NOT_IMPLEMENTED,
                    'File uploads are not enabled.'
                ),
                false
            );
        }

        if (appConfig.uploads.allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new ApiError(
                    HTTP_STATUS.BAD_REQUEST,
                    `File type '${file.mimetype}' is not allowed.`
                ),
                false
            );
        }
    },
    limits: {
        fileSize: appConfig.uploads.maxFileSize,
    },
};

const upload = multer(multerOptions);

module.exports = upload;
