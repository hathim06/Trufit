import { MESSAGES } from '../../utils/messages.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';
import reviewService from '../Services/reviewService.js';

const addReview = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.session.user;
        const { rating, title, comment } = req.body;

        if (!rating || !title || !comment) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.ALL_FIELDS_REQUIRED });
        }

        if (rating < 1 || rating > 5) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.RATING_RANGE });
        }

        const review = await reviewService.addReviewService(productId, userId, { rating, title, comment });
        res.json({ success: true, message: MESSAGES.REVIEW_ADDED, review });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const reviewData = await reviewService.getProductReviewsService(productId);
        res.json({ success: true, ...reviewData });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.session.user;
        
        await reviewService.deleteReviewService(reviewId, userId);
        res.json({ success: true, message: MESSAGES.REVIEW_DELETED });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.session.user;
        const { rating, title, comment } = req.body;

        if (!rating || !title || !comment) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.ALL_FIELDS_REQUIRED });
        }

        if (rating < 1 || rating > 5) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.RATING_RANGE });
        }

        await reviewService.updateReviewService(reviewId, userId, { rating, title, comment });
        res.json({ success: true, message: MESSAGES.REVIEW_UPDATED });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

export default {
    addReview,
    getProductReviews,
    updateReview,
    deleteReview
};
