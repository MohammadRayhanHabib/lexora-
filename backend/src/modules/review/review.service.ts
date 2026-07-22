import { ObjectId } from "mongodb";
import { AppDataSource } from "../../config/database";
import { ReviewRequest } from "../../entities/ReviewRequest";
import { ReviewFeedback } from "../../entities/ReviewFeedback";
import { Attempt } from "../../entities/Attempt";
import { User } from "../../entities/User";
import { CreditLedger } from "../../entities/CreditLedger";
import {
  ReviewStatus,
  TestModule,
  CreditAction,
  AuditAction,
  AttemptStatus,
} from "../../types";
import { createAuditLog } from "../../middlewares/auditLogger";
import { sendReviewCompleteEmail } from "../../utils/email";
import logger from "../../utils/logger";

const reviewRepo = () => AppDataSource.getMongoRepository(ReviewRequest);
const feedbackRepo = () => AppDataSource.getMongoRepository(ReviewFeedback);
const attemptRepo = () => AppDataSource.getMongoRepository(Attempt);
const userRepo = () => AppDataSource.getMongoRepository(User);
const creditRepo = () => AppDataSource.getMongoRepository(CreditLedger);

const REVIEW_CREDIT_COST = 1; // Credits per review

export class ReviewService {
  /**
   * User requests expert review for Writing or Speaking
   * Flow: Check credits → Deduct → Create review request
   */
  async requestReview(
    userId: string,
    attemptId: string,
    module: TestModule,
  ): Promise<ReviewRequest> {
    // Only Writing and Speaking can be reviewed
    if (module !== TestModule.WRITING && module !== TestModule.SPEAKING) {
      throw new Error(
        "Only Writing and Speaking modules can be sent for expert review",
      );
    }

    // Verify attempt exists and belongs to user
    const attempt = await attemptRepo().findOne({
      where: { _id: new ObjectId(attemptId) as any, userId },
    });
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.status !== AttemptStatus.COMPLETED)
      throw new Error("Attempt must be completed before requesting review");

    // Check if review already requested
    const existingReview = await reviewRepo().findOne({
      where: { attemptId, module: module as any, userId },
    });
    if (existingReview && existingReview.status !== ReviewStatus.REJECTED) {
      throw new Error("Review already requested for this attempt and module");
    }

    // Check user credit balance
    const user = await userRepo().findOne({
      where: { _id: new ObjectId(userId) as any },
    });
    if (!user) throw new Error("User not found");
    if (user.creditBalance < REVIEW_CREDIT_COST) {
      throw new Error("Insufficient credits. Please purchase more credits");
    }

    // Deduct credits immediately
    const newBalance = user.creditBalance - REVIEW_CREDIT_COST;
    await userRepo().updateOne(
      { _id: new ObjectId(userId) },
      { $set: { creditBalance: newBalance } },
    );

    // Record in credit ledger (immutable)
    const ledgerEntry = new CreditLedger();
    ledgerEntry.userId = userId;
    ledgerEntry.action = CreditAction.DEDUCTED;
    ledgerEntry.amount = REVIEW_CREDIT_COST;
    ledgerEntry.balanceAfter = newBalance;
    ledgerEntry.reason = `Expert review request for ${module}`;
    ledgerEntry.referenceId = attemptId;
    ledgerEntry.referenceType = "review_request";
    await creditRepo().save(ledgerEntry);

    // Extract submission content
    const submissionContent: any = {};
    if (module === TestModule.WRITING && attempt.answers) {
      submissionContent.writingResponse =
        attempt.answers.writing || attempt.answers;
    }
    if (module === TestModule.SPEAKING && attempt.answers) {
      submissionContent.speakingAudioUrl = attempt.answers.speakingAudioUrl;
    }

    // Create review request
    const reviewRequest = new ReviewRequest();
    reviewRequest.userId = userId;
    reviewRequest.attemptId = attemptId;
    reviewRequest.module = module;
    reviewRequest.status = ReviewStatus.PENDING;
    reviewRequest.creditsDeducted = REVIEW_CREDIT_COST;
    reviewRequest.submissionContent = submissionContent;

    const saved = await reviewRepo().save(reviewRequest);

    await createAuditLog({
      userId,
      action: AuditAction.REVIEW_REQUESTED,
      resourceType: "review_request",
      resourceId: saved._id.toString(),
      details: { attemptId, module, creditsDeducted: REVIEW_CREDIT_COST },
    });

    await createAuditLog({
      userId,
      action: AuditAction.CREDIT_DEDUCTED,
      resourceType: "credit_ledger",
      details: {
        amount: REVIEW_CREDIT_COST,
        newBalance,
        reason: `Review request for ${module}`,
      },
    });

    return saved;
  }

  /**
   * Admin assigns a reviewer to a review request
   */
  async assignReviewer(
    reviewRequestId: string,
    reviewerId: string,
    adminId: string,
  ): Promise<ReviewRequest> {
    const review = await reviewRepo().findOne({
      where: { _id: new ObjectId(reviewRequestId) as any },
    });
    if (!review) throw new Error("Review request not found");
    if (review.status !== ReviewStatus.PENDING)
      throw new Error("Review request is not in pending state");

    // Verify reviewer exists and has reviewer role
    const reviewer = await userRepo().findOne({
      where: { _id: new ObjectId(reviewerId) as any },
    });
    if (!reviewer) throw new Error("Reviewer not found");

    review.reviewerId = reviewerId;
    review.status = ReviewStatus.ASSIGNED;
    review.assignedAt = new Date();

    const saved = await reviewRepo().save(review);

    await createAuditLog({
      userId: adminId,
      action: AuditAction.REVIEW_ASSIGNED,
      resourceType: "review_request",
      resourceId: reviewRequestId,
      details: { reviewerId, assignedBy: adminId },
    });

    return saved;
  }

  /**
   * Reviewer submits feedback (band score + detailed feedback)
   */
  async submitFeedback(
    reviewerId: string,
    reviewRequestId: string,
    bandScore: number,
    feedback: string,
    criteriaScores?: Record<string, number>,
  ): Promise<ReviewFeedback> {
    const review = await reviewRepo().findOne({
      where: { _id: new ObjectId(reviewRequestId) as any },
    });
    if (!review) throw new Error("Review request not found");
    if (review.reviewerId !== reviewerId)
      throw new Error("You are not assigned to this review");
    if (review.status === ReviewStatus.COMPLETED)
      throw new Error("Review already completed");

    // Create feedback
    const reviewFeedback = new ReviewFeedback();
    reviewFeedback.reviewRequestId = reviewRequestId;
    reviewFeedback.reviewerId = reviewerId;
    reviewFeedback.userId = review.userId;
    reviewFeedback.attemptId = review.attemptId;
    reviewFeedback.module = review.module;
    reviewFeedback.bandScore = bandScore;
    reviewFeedback.feedback = feedback;
    reviewFeedback.criteriaScores = criteriaScores;

    const savedFeedback = await feedbackRepo().save(reviewFeedback);

    // Update review request status
    review.status = ReviewStatus.COMPLETED;
    review.completedAt = new Date();
    await reviewRepo().save(review);

    // Update attempt with manual scores
    const attempt = await attemptRepo().findOne({
      where: { _id: new ObjectId(review.attemptId) as any },
    });
    if (attempt) {
      if (!attempt.manualScores) attempt.manualScores = {};
      (attempt.manualScores as any)[review.module] = {
        bandScore,
        reviewRequestId,
      };

      // Recalculate overall band if all scores available
      attempt.overallBandScore = this.calculateOverallBand(attempt);
      await attemptRepo().save(attempt);
    }

    // Send notification email to user
    const user = await userRepo().findOne({
      where: { _id: new ObjectId(review.userId) as any },
    });
    if (user) {
      await sendReviewCompleteEmail(user.email, review.module);
    }

    await createAuditLog({
      userId: reviewerId,
      action: AuditAction.REVIEW_COMPLETED,
      resourceType: "review_feedback",
      resourceId: savedFeedback._id.toString(),
      details: { bandScore, reviewRequestId, module: review.module },
    });

    return savedFeedback;
  }

  /**
   * Reject a review request (credits refunded)
   */
  async rejectReview(
    reviewRequestId: string,
    reason: string,
    adminId: string,
  ): Promise<ReviewRequest> {
    const review = await reviewRepo().findOne({
      where: { _id: new ObjectId(reviewRequestId) as any },
    });
    if (!review) throw new Error("Review request not found");

    review.status = ReviewStatus.REJECTED;
    review.rejectedAt = new Date();
    review.rejectionReason = reason;
    const saved = await reviewRepo().save(review);

    // Refund credits
    const user = await userRepo().findOne({
      where: { _id: new ObjectId(review.userId) as any },
    });
    if (user) {
      const newBalance = user.creditBalance + review.creditsDeducted;
      await userRepo().updateOne(
        { _id: new ObjectId(review.userId) },
        { $set: { creditBalance: newBalance } },
      );

      const ledgerEntry = new CreditLedger();
      ledgerEntry.userId = review.userId;
      ledgerEntry.action = CreditAction.REFUNDED;
      ledgerEntry.amount = review.creditsDeducted;
      ledgerEntry.balanceAfter = newBalance;
      ledgerEntry.reason = `Review rejected: ${reason}`;
      ledgerEntry.referenceId = reviewRequestId;
      ledgerEntry.referenceType = "review_request";
      ledgerEntry.performedBy = adminId;
      await creditRepo().save(ledgerEntry);

      await createAuditLog({
        userId: adminId,
        action: AuditAction.CREDIT_REFUNDED,
        resourceType: "credit_ledger",
        details: {
          userId: review.userId,
          amount: review.creditsDeducted,
          reason,
        },
      });
    }

    return saved;
  }

  /**
   * Get review requests for user
   */
  async getUserReviews(userId: string): Promise<ReviewRequest[]> {
    return reviewRepo().find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get review queue (admin/reviewer)
   */
  async getReviewQueue(
    status?: ReviewStatus,
    reviewerId?: string,
  ): Promise<ReviewRequest[]> {
    const where: any = {};
    if (status) where.status = status;
    if (reviewerId) where.reviewerId = reviewerId;

    return reviewRepo().find({ where, order: { createdAt: "ASC" } });
  }

  /**
   * Get feedback for a review
   */
  async getFeedback(reviewRequestId: string): Promise<ReviewFeedback | null> {
    return feedbackRepo().findOne({ where: { reviewRequestId } });
  }

  /**
   * Calculate overall IELTS band score from all modules
   */
  private calculateOverallBand(attempt: Attempt): number | undefined {
    const scores: number[] = [];

    if (attempt.autoScores?.listening)
      scores.push(attempt.autoScores.listening.bandScore);
    if (attempt.autoScores?.reading)
      scores.push(attempt.autoScores.reading.bandScore);
    if (attempt.manualScores?.writing)
      scores.push(attempt.manualScores.writing.bandScore);
    if (attempt.manualScores?.speaking)
      scores.push(attempt.manualScores.speaking.bandScore);

    if (scores.length < 4) return undefined; // Not all modules scored yet

    const average = scores.reduce((a, b) => a + b, 0) / 4;
    // Round to nearest 0.5
    return Math.round(average * 2) / 2;
  }
}

export const reviewService = new ReviewService();
