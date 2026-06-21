import notFoundHandler from './notFoundHandler.js';
import errorHandler from './errorHandler.js';

const registerErrorHandlers = (app) => {
    app.use(notFoundHandler);
    app.use(errorHandler);
};

export default registerErrorHandlers;
