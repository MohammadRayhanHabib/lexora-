import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth";
import { UserRole } from "../../types";
import { speakingController } from "./speaking.controller";
import { uploadSpeakingAudio } from "../../utils/upload";

const router = Router();

// ── All routes require authentication ────────────────────────────────────────
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN routes
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/admin/tests",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  speakingController.adminListTests.bind(speakingController),
);
router.get(
  "/admin/tests/:id",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  speakingController.adminGetTest.bind(speakingController),
);
router.post(
  "/admin/tests",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  speakingController.adminCreateTest.bind(speakingController),
);
router.put(
  "/admin/tests/:id",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  speakingController.adminUpdateTest.bind(speakingController),
);
router.delete(
  "/admin/tests/:id",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  speakingController.adminDeleteTest.bind(speakingController),
);
router.get(
  "/admin/sessions",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  speakingController.adminListSessions.bind(speakingController),
);
router.get(
  "/admin/sessions/:id",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  speakingController.adminGetSession.bind(speakingController),
);
router.post(
  "/admin/sessions/:id/score",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  speakingController.adminScoreSession.bind(speakingController),
);

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT routes
// ─────────────────────────────────────────────────────────────────────────────
router.get("/active", speakingController.listActive.bind(speakingController));
router.get("/tests/:id", speakingController.getTest.bind(speakingController));
router.post("/start", speakingController.startSession.bind(speakingController));
router.get(
  "/timer/:testId",
  speakingController.getTimer.bind(speakingController),
);
router.post(
  "/part-timer",
  speakingController.setPartTimer.bind(speakingController),
);
router.get(
  "/part-timer/:testId/:part",
  speakingController.getPartTimer.bind(speakingController),
);
router.post(
  "/upload-audio",
  uploadSpeakingAudio.single("audio"),
  speakingController.uploadAudio.bind(speakingController),
);
router.post(
  "/submit",
  speakingController.submitSession.bind(speakingController),
);
router.get(
  "/my-sessions",
  speakingController.mySessions.bind(speakingController),
);
router.get(
  "/sessions/:id",
  speakingController.getSessionDetail.bind(speakingController),
);

export default router;
