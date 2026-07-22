import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth";
import { UserRole } from "../../types";
import { listeningController } from "./listening.controller";
import { uploadListeningAudio, uploadListeningMapImage } from "../../utils/upload";

const router = Router();

// ── All routes require authentication ────────────────────────────────────────
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN routes
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/admin/tests",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  listeningController.adminListTests.bind(listeningController),
);
router.get(
  "/admin/tests/:id",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  listeningController.adminGetTest.bind(listeningController),
);
router.post(
  "/admin/map-image",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  uploadListeningMapImage.single("image"),
  listeningController.adminUploadMapImage.bind(listeningController),
);
router.post(
  "/admin/tests",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  uploadListeningAudio.single("audio"),
  listeningController.adminCreateTest.bind(listeningController),
);
router.put(
  "/admin/tests/:id",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  uploadListeningAudio.single("audio"),
  listeningController.adminUpdateTest.bind(listeningController),
);
router.delete(
  "/admin/tests/:id",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  listeningController.adminDeleteTest.bind(listeningController),
);
router.get(
  "/admin/tests/:id/attempts",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  listeningController.adminGetAttempts.bind(listeningController),
);

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT routes
// ─────────────────────────────────────────────────────────────────────────────
router.get("/active", listeningController.listActive.bind(listeningController));
router.get("/tests/:id", listeningController.getTest.bind(listeningController));
router.post(
  "/start",
  listeningController.startAttempt.bind(listeningController),
);
router.get(
  "/timer/:testId",
  listeningController.getTimer.bind(listeningController),
);
router.post(
  "/autosave",
  listeningController.autosave.bind(listeningController),
);
router.post(
  "/submit",
  listeningController.submitAttempt.bind(listeningController),
);
router.get(
  "/my-attempts",
  listeningController.myAttempts.bind(listeningController),
);
router.get(
  "/attempts/:id",
  listeningController.getAttemptDetail.bind(listeningController),
);

export default router;
