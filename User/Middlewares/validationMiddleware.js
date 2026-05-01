const { ZodError } = require('zod');

const validateBody = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            const message = error.errors[0].message;
            
            // If it's an admin route, we might want to render the page back with errors
            if (req.baseUrl.startsWith('/admin')) {
                const originalUrl = req.originalUrl;
                // We need to know which view to render. For simplicity, we redirect back with error.
                // But a better way is to pass errors to the controller.
                // For now, let's use the query param approach since it's already used in the project.
                return res.redirect(`${req.header('Referer') || originalUrl}?message=${encodeURIComponent(message)}`);
            }
            
            return res.status(400).json({ success: false, message });
        }
        next(error);
    }
};

module.exports = {
    validateBody
};
