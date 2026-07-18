import { MESSAGES } from '../utils/messages.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

const notFoundHandler = (req, res) => {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
            success: false,
            message: MESSAGES.NOT_FOUND
        });
    }
    res.status(STATUS_CODES.NOT_FOUND).render('users/404', {
        title: '404 - Page Not Found',
        message: MESSAGES.NOT_FOUND
    });
};

export default notFoundHandler;
