import { Router } from "express";
import { readingController } from "./reading.controller";
import { authenticate, authorize } from "../../middlewares/auth";
import { UserRole } from "../../types";
import { uploadReadingPassageImage } from "../../utils/upload";

const router = Router();
router.use(authenticate);

// ─── Admin Routes (admin / super_admin only) ───────────────
const adminOnly = authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN);

router.get("/admin/tests", adminOnly, (req, res) =>
  readingController.adminListTests(req, res),
);
router.get("/admin/tests/:id", adminOnly, (req, res) =>
  readingController.adminGetTest(req, res),
);
router.post(
  "/admin/tests",
  adminOnly,
  uploadReadingPassageImage.single("passageImageFile"),
  (req, res) => readingController.adminCreateTest(req, res),
);
router.put(
  "/admin/tests/:id",
  adminOnly,
  uploadReadingPassageImage.single("passageImageFile"),
  (req, res) => readingController.adminUpdateTest(req, res),
);
router.delete("/admin/tests/:id", adminOnly, (req, res) =>
  readingController.adminDeleteTest(req, res),
);

// Questions
router.get("/admin/tests/:testId/questions", adminOnly, (req, res) =>
  readingController.adminGetQuestions(req, res),
);
router.post("/admin/tests/:testId/questions", adminOnly, (req, res) =>
  readingController.adminCreateQuestion(req, res),
);
router.post("/admin/tests/:testId/questions/reorder", adminOnly, (req, res) =>
  readingController.adminReorderQuestions(req, res),
);
router.put("/admin/questions/:id", adminOnly, (req, res) =>
  readingController.adminUpdateQuestion(req, res),
);
router.delete("/admin/questions/:id", adminOnly, (req, res) =>
  readingController.adminDeleteQuestion(req, res),
);

// Attempts view
router.get("/admin/tests/:testId/attempts", adminOnly, (req, res) =>
  readingController.adminGetAttempts(req, res),
);

// ─── Student Routes ────────────────────────────────────────

router.get("/tests/grouped", (req, res) =>
  readingController.listGroupedTests(req, res),
);
router.get("/tests", (req, res) => readingController.listTests(req, res));
router.get("/tests/:id", (req, res) => readingController.getTest(req, res));

router.post("/tests/:testId/start", (req, res) =>
  readingController.startAttempt(req, res),
);

router.get("/attempts/:id/timer", (req, res) =>
  readingController.getTimer(req, res),
);
router.post("/attempts/:id/autosave", (req, res) =>
  readingController.autoSave(req, res),
);
router.get("/attempts/:id/draft", (req, res) =>
  readingController.getDraft(req, res),
);
router.post("/attempts/:id/submit", (req, res) =>
  readingController.submitAttempt(req, res),
);
router.get("/attempts/:id", (req, res) =>
  readingController.getAttempt(req, res),
);
router.get("/my-attempts", (req, res) =>
  readingController.myAttempts(req, res),
);

export default router;
