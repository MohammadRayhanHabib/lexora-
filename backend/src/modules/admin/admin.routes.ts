import { Router } from "express";
import { adminController } from "./admin.controller";
import { authenticate, authorize } from "../../middlewares/auth";
import { UserRole } from "../../types";

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

// Dashboard
router.get("/dashboard", (req, res) => adminController.getDashboard(req, res));

// Users
router.get("/users", (req, res) => adminController.listUsers(req, res));
// Support both /users/:userId/status (frontend) and /users/status (legacy)
router.put("/users/:userId/status", (req, res) =>
  adminController.updateUserStatus(req, res),
);
router.put("/users/status", (req, res) =>
  adminController.updateUserStatus(req, res),
);
router.put("/users/:userId/role", (req, res) =>
  adminController.updateUserRole(req, res),
);
router.put("/users/role", (req, res) =>
  adminController.updateUserRole(req, res),
);

// Subscriptions
router.put("/subscriptions", (req, res) =>
  adminController.manageSubscription(req, res),
);

// Reviews
router.get("/reviews/queue", (req, res) =>
  adminController.getReviewQueue(req, res),
);
router.post("/reviews/assign", (req, res) =>
  adminController.assignReviewer(req, res),
);

// Attempts
router.get("/attempts/:userId", (req, res) =>
  adminController.getUserAttempts(req, res),
);

// Payments & Credits
router.get("/payments", (req, res) =>
  adminController.getPaymentLedger(req, res),
);
router.get("/credits", (req, res) => adminController.getCreditLedger(req, res));
router.post("/credits/adjust", (req, res) =>
  adminController.adjustCredits(req, res),
);

// Promo Codes
router.post("/promo-codes", (req, res) =>
  adminController.createPromoCode(req, res),
);
router.get("/promo-codes", (req, res) =>
  adminController.listPromoCodes(req, res),
);

// Notifications
router.post("/notifications", (req, res) =>
  adminController.sendNotification(req, res),
);
// alias used by frontend api
router.post("/notify", (req, res) =>
  adminController.sendNotification(req, res),
);
router.post("/notify/bulk", (req, res) =>
  adminController.sendNotification(req, res),
);

// Audit Logs
router.get("/audit-logs", (req, res) => adminController.getAuditLogs(req, res));

export default router;
