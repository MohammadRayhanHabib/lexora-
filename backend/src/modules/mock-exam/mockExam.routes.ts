import { Router } from "express";
import { mockExamController } from "./mockExam.controller";
import { authenticate, authorize } from "../../middlewares/auth";
import { UserRole } from "../../types";

const router = Router();
router.use(authenticate);

const adminOnly = authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN);

// ─── Admin Routes ──────────────────────────────────────────────

router.get("/admin/exams", adminOnly, (req, res) =>
  mockExamController.adminListExams(req, res),
);
router.get("/admin/exams/:id", adminOnly, (req, res) =>
  mockExamController.adminGetExam(req, res),
);
router.post("/admin/exams", adminOnly, (req, res) =>
  mockExamController.adminCreateExam(req, res),
);
router.put("/admin/exams/:id", adminOnly, (req, res) =>
  mockExamController.adminUpdateExam(req, res),
);
router.delete("/admin/exams/:id", adminOnly, (req, res) =>
  mockExamController.adminDeleteExam(req, res),
);

// Attempts & Grading
router.get("/admin/attempts", adminOnly, (req, res) =>
  mockExamController.adminListAttempts(req, res),
);
router.get("/admin/attempts/pending", adminOnly, (req, res) =>
  mockExamController.adminPendingReviews(req, res),
);
router.get("/admin/attempts/:id", adminOnly, (req, res) =>
  mockExamController.adminGetAttempt(req, res),
);
router.post("/admin/attempts/:id/grade-writing", adminOnly, (req, res) =>
  mockExamController.adminGradeWriting(req, res),
);
router.post("/admin/attempts/:id/grade-speaking", adminOnly, (req, res) =>
  mockExamController.adminGradeSpeaking(req, res),
);
router.post("/admin/attempts/:id/publish", adminOnly, (req, res) =>
  mockExamController.adminPublishResult(req, res),
);
router.get("/admin/analytics", adminOnly, (req, res) =>
  mockExamController.adminGetAnalytics(req, res),
);

// ─── Student Routes ────────────────────────────────────────────

router.get("/exams", (req, res) => mockExamController.listExams(req, res));
router.get("/exams/:id", (req, res) => mockExamController.getExam(req, res));
router.post("/exams/:id/attempt", (req, res) =>
  mockExamController.startAttempt(req, res),
);
router.patch("/attempts/:id", (req, res) =>
  mockExamController.updateAttempt(req, res),
);
router.get("/attempts/:id", (req, res) =>
  mockExamController.getAttempt(req, res),
);
router.get("/my-attempts", (req, res) =>
  mockExamController.myAttempts(req, res),
);

export default router;
