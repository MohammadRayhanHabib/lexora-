import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth";
import { UserRole } from "../../types";
import * as ctrl from "./enrollment.controller";

const router = Router();

// ─── Student routes ───────────────────────────────────────────────────────────
router.get("/my", authenticate, ctrl.getMyEnrollments);
router.post("/", authenticate, ctrl.enroll);
router.delete("/", authenticate, ctrl.unenroll);

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get(
  "/admin/all",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  ctrl.adminListEnrollments,
);
router.delete(
  "/admin/:id",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  ctrl.adminDeleteEnrollment,
);

export default router;
