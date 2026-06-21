import { MESSAGES } from '../utils/messages.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

const errorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    console.error('Unhandled Error:', error);

    const statusCode = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    const message = statusCode === STATUS_CODES.INTERNAL_SERVER_ERROR
        ? MESSAGES.SERVER_ERROR
        : error.message || MESSAGES.SERVER_ERROR;

    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(statusCode).json({
            success: false,
            message
        });
    }

    res.status(statusCode).send(message);
};

export default errorHandler;
