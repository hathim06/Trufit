const reviewService = require('../Services/reviewService');

const addReview = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.session.user;
        const { rating, title, comment } = req.body;

        if (!rating || !title || !comment) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
        }

        const review = await reviewService.addReviewService(productId, userId, { rating, title, comment });
        res.json({ success: true, message: "Review added successfully", review });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const reviewData = await reviewService.getProductReviewsService(productId);
        res.json({ success: true, ...reviewData });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.session.user;
        
        await reviewService.deleteReviewService(reviewId, userId);
        res.json({ success: true, message: "Review deleted successfully" });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.session.user;
        const { rating, title, comment } = req.body;

        if (!rating || !title || !comment) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
        }

        await reviewService.updateReviewService(reviewId, userId, { rating, title, comment });
        res.json({ success: true, message: "Review updated successfully" });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    addReview,
    getProductReviews,
    updateReview,
    deleteReview
};
