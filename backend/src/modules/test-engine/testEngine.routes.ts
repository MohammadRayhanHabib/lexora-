import { Router } from "express";
import { testEngineController } from "./testEngine.controller";
import { authenticate } from "../../middlewares/auth";
import {
  blockMobileForMock,
  detectIncognito,
} from "../../middlewares/deviceCheck";
import { apiRateLimiter } from "../../middlewares/rateLimit";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── Practice Routes ──────────────────────────────────────
router.get("/practice", (req, res) =>
  testEngineController.listPracticeTests(req, res),
);
router.get("/practice/:id", (req, res) =>
  testEngineController.getPracticeTest(req, res),
);
router.post("/practice/start", detectIncognito, (req, res) =>
  testEngineController.startPracticeTest(req, res),
);
router.post("/practice/submit", (req, res) =>
  testEngineController.submitPracticeTest(req, res),
);
router.get("/practice/:testId/recent", (req, res) =>
  testEngineController.getRecentPracticeAttempts(req, res),
);

// ─── Mock Routes ──────────────────────────────────────────
router.get("/mock", (req, res) => testEngineController.listMockTests(req, res));
router.get("/mock/:id", (req, res) =>
  testEngineController.getMockTest(req, res),
);
router.post("/mock/start", blockMobileForMock, detectIncognito, (req, res) =>
  testEngineController.startMockTest(req, res),
);
router.post("/mock/submit", (req, res) =>
  testEngineController.submitMockTest(req, res),
);

// ─── Attempt Routes ───────────────────────────────────────
router.get("/attempts", (req, res) =>
  testEngineController.getUserAttempts(req, res),
);
router.get("/attempts/:id", (req, res) =>
  testEngineController.getAttempt(req, res),
);

export default router;
