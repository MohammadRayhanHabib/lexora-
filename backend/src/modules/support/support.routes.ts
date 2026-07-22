import { Router } from "express";
import { supportController } from "./support.controller";
import { authenticate, authorize } from "../../middlewares/auth";
import { UserRole } from "../../types";

const router = Router();

router.use(authenticate);

// User routes
router.post("/tickets", (req, res) => supportController.createTicket(req, res));
router.post("/tickets/reply", (req, res) =>
  supportController.replyToTicket(req, res),
);
router.get("/tickets", (req, res) =>
  supportController.getUserTickets(req, res),
);
router.get("/tickets/:id", (req, res) => supportController.getTicket(req, res));

// Admin routes
router.get(
  "/tickets/all",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  (req, res) => supportController.getAllTickets(req, res),
);
router.put(
  "/tickets/:id/status",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  (req, res) => supportController.updateStatus(req, res),
);

export default router;
