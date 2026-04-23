const mongoose = require('mongoose');
const reviewModel = require('../models/reviewModel');
const productModel = require('../models/productModel');
const userModel = require('../models/userModel');

const addReviewService = async (productId, userId, reviewData) => {
    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid product or user ID");
    }

    const user = await userModel.findById(userId);
    if (!user) throw new Error("User not found");

    const product = await productModel.findById(productId);
    if (!product) throw new Error("Product not found");

    const review = new reviewModel({
        productId,
        userId,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        userProfilePicture: user.profilePicture || null,
        isVerified: true,
        createdAt: new Date()
    });

    return await review.save();
};

const getProductReviewsService = async (productId) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error("Invalid product ID");
    }

    const reviews = await reviewModel.find({ productId })
        .sort({ createdAt: -1 })
        .lean();

    if (reviews.length === 0) {
        return {
            reviews: [],
            averageRating: 0,
            totalReviews: 0,
            ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        };
    }

    const averageRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    reviews.forEach(r => {
        ratingDistribution[r.rating]++;
    });

    return {
        reviews,
        averageRating: parseFloat(averageRating),
        totalReviews: reviews.length,
        ratingDistribution
    };
};

const updateReviewService = async (reviewId, userId, updateData) => {
    const review = await reviewModel.findById(reviewId);
    if (!review) throw new Error("Review not found");

    if (review.userId.toString() !== userId.toString()) {
        throw new Error("Unauthorized to update this review");
    }

    return await reviewModel.findByIdAndUpdate(
        reviewId,
        {
            rating: updateData.rating,
            title: updateData.title,
            comment: updateData.comment,
            updatedAt: new Date()
        },
        { new: true }
    );
};

const deleteReviewService = async (reviewId, userId) => {
    const review = await reviewModel.findById(reviewId);
    if (!review) throw new Error("Review not found");

    if (review.userId.toString() !== userId.toString()) {
        throw new Error("Unauthorized to delete this review");
    }

    return await reviewModel.findByIdAndDelete(reviewId);
};

module.exports = {
    addReviewService,
    getProductReviewsService,
    updateReviewService,
    deleteReviewService
};
