import { Router } from "express";
import { reviewController } from "./review.controller";
import { authenticate, authorize } from "../../middlewares/auth";
import { UserRole } from "../../types";

const router = Router();

router.use(authenticate);

// Student routes
router.post("/request", (req, res) => reviewController.requestReview(req, res));
router.get("/my-reviews", (req, res) =>
  reviewController.getUserReviews(req, res),
);
router.get("/feedback/:reviewRequestId", (req, res) =>
  reviewController.getFeedback(req, res),
);

// Reviewer routes
router.post(
  "/feedback",
  authorize(UserRole.REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  (req, res) => reviewController.submitFeedback(req, res),
);

// Admin routes
router.get(
  "/queue",
  authorize(UserRole.REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  (req, res) => reviewController.getReviewQueue(req, res),
);
router.post(
  "/reject",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  (req, res) => reviewController.rejectReview(req, res),
);

export default router;
