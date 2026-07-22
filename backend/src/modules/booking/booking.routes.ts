import { Router } from "express";
import { bookingController } from "./booking.controller";
import { authenticate, authorize } from "../../middlewares/auth";
import { UserRole } from "../../types";

const router = Router();

/* ── Student routes ─────────────────────────────────── */
router.post("/", authenticate, bookingController.createBooking);
router.get("/", authenticate, bookingController.getUserBookings);
router.get("/:id", authenticate, bookingController.getBooking);
router.put("/:id/cancel", authenticate, bookingController.cancelBooking);

/* ── Admin routes ───────────────────────────────────── */
router.get(
  "/admin/all",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  bookingController.getAllBookings,
);
router.put(
  "/:id/confirm",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  bookingController.confirmBooking,
);
router.put(
  "/:id/complete",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  bookingController.completeBooking,
);

export default router;
