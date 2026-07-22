import { Router } from "express";
import { paymentController } from "./payment.controller";
import { authenticate, authorize } from "../../middlewares/auth";
import { paymentRateLimiter } from "../../middlewares/rateLimit";
import { UserRole } from "../../types";

const router = Router();

router.use(authenticate);

// User routes
router.post("/", paymentRateLimiter, (req, res) =>
  paymentController.createPayment(req, res),
);
router.post("/verify", paymentRateLimiter, (req, res) =>
  paymentController.verifyPayment(req, res),
);
router.post("/fail", (req, res) => paymentController.failPayment(req, res));
router.get("/history", (req, res) =>
  paymentController.getUserPayments(req, res),
);
router.get("/credits", (req, res) =>
  paymentController.getCreditLedger(req, res),
);

// Admin routes
router.get(
  "/all",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  (req, res) => paymentController.getAllPayments(req, res),
);

export default router;
