import { Response } from "express";
import { reviewService } from "./review.service";
import { ApiResponse } from "../../utils/response";
import {
  validate,
  requestReviewSchema,
  submitFeedbackSchema,
} from "../../utils/validators";
import { AuthenticatedRequest, ReviewStatus } from "../../types";

export class ReviewController {
  /** POST /api/reviews/request */
  async requestReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = validate(requestReviewSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }

      const review = await reviewService.requestReview(
        req.user!.id,
        value.attemptId,
        value.module,
      );
      ApiResponse.created(res, review, "Review requested. Credits deducted.");
    } catch (err: any) {
      if (err.message.includes("Insufficient credits")) {
        ApiResponse.badRequest(res, err.message);
        return;
      }
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** POST /api/reviews/feedback */
  async submitFeedback(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { error, value } = validate(submitFeedbackSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }

      const feedback = await reviewService.submitFeedback(
        req.user!.id,
        value.reviewRequestId,
        value.bandScore,
        value.feedback,
        value.criteriaScores,
      );
      ApiResponse.success(res, feedback, "Feedback submitted successfully");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** GET /api/reviews/my-reviews */
  async getUserReviews(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const reviews = await reviewService.getUserReviews(req.user!.id);
      ApiResponse.success(res, reviews);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/reviews/queue?status=pending */
  async getReviewQueue(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const status = req.query.status as ReviewStatus | undefined;
      const reviewerId = req.query.reviewerId as string | undefined;
      const reviews = await reviewService.getReviewQueue(status, reviewerId);
      ApiResponse.success(res, reviews);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/reviews/feedback/:reviewRequestId */
  async getFeedback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const feedback = await reviewService.getFeedback(
        req.params.reviewRequestId,
      );
      if (!feedback) {
        ApiResponse.notFound(res, "Feedback not found");
        return;
      }
      ApiResponse.success(res, feedback);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/reviews/reject */
  async rejectReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { reviewRequestId, reason } = req.body;
      if (!reviewRequestId || !reason) {
        ApiResponse.badRequest(res, "reviewRequestId and reason are required");
        return;
      }
      const review = await reviewService.rejectReview(
        reviewRequestId,
        reason,
        req.user!.id,
      );
      ApiResponse.success(res, review, "Review rejected. Credits refunded.");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }
}

export const reviewController = new ReviewController();
