import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth";
import { UserRole } from "../../types";
import { uploadWritingImage } from "../../utils/upload";
import * as ctrl from "./writing.controller";

const router = Router();
const adminOnly = authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN);

// All routes require authentication
router.use(authenticate);

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get("/admin/modules", adminOnly, ctrl.adminListModules);
router.get("/admin/modules/:id", adminOnly, ctrl.adminGetModule);
router.post(
  "/admin/modules",
  adminOnly,
  uploadWritingImage.single("image"),
  ctrl.adminCreateModule,
);
router.put(
  "/admin/modules/:id",
  adminOnly,
  uploadWritingImage.single("image"),
  ctrl.adminUpdateModule,
);
router.delete("/admin/modules/:id", adminOnly, ctrl.adminDeleteModule);

// Submissions per module
router.get(
  "/admin/modules/:moduleId/submissions",
  adminOnly,
  ctrl.adminGetSubmissions,
);
router.get("/admin/submissions/:sessionId", adminOnly, ctrl.adminGetSubmission);
router.post(
  "/admin/submissions/:sessionId/score",
  adminOnly,
  ctrl.adminScoreSession,
);

// ─── Student routes ───────────────────────────────────────────────────────────
router.get("/modules", ctrl.listActiveModules);
router.get("/modules/:id", ctrl.getModule);

// Session lifecycle
router.post("/sessions", ctrl.startSession);
router.get("/sessions/history", ctrl.getMyHistory);
router.get("/sessions/:sessionId", ctrl.getSession);
router.get("/sessions/:sessionId/timer", ctrl.getTimer);
router.get("/sessions/:sessionId/draft", ctrl.getDraft);
router.post("/sessions/:sessionId/autosave", ctrl.autoSave);
router.post("/sessions/:sessionId/pause", ctrl.pauseSession);
router.post("/sessions/:sessionId/resume", ctrl.resumeSession);
router.post("/sessions/:sessionId/submit", ctrl.submitSession);

export default router;
