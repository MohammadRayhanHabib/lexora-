import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticate } from "../../middlewares/auth";
import { authRateLimiter, otpRateLimiter } from "../../middlewares/rateLimit";
import { uploadProfilePhoto } from "../../utils/upload";

const router = Router();

// Public routes
router.post("/register", authRateLimiter, (req, res) =>
  authController.register(req, res),
);
router.post("/login", authRateLimiter, (req, res) =>
  authController.login(req, res),
);
router.post("/google", authRateLimiter, (req, res) =>
  authController.googleAuth(req, res),
);
router.post("/verify-otp", otpRateLimiter, (req, res) =>
  authController.verifyOTP(req, res),
);

// Protected routes
router.post("/logout", authenticate, (req, res) =>
  authController.logout(req, res),
);
router.get("/profile", authenticate, (req, res) =>
  authController.getProfile(req, res),
);
router.put("/profile", authenticate, (req, res) =>
  authController.updateProfile(req, res),
);
router.post(
  "/profile/photo",
  authenticate,
  uploadProfilePhoto.single("photo"),
  (req, res) => authController.uploadProfilePhoto(req, res),
);
router.delete("/profile/photo", authenticate, (req, res) =>
  authController.removeProfilePhoto(req, res),
);
router.put("/change-password", authenticate, (req, res) =>
  authController.changePassword(req, res),
);
router.put("/toggle-2fa", authenticate, (req, res) =>
  authController.toggleTwoFactor(req, res),
);
router.post("/2fa/setup", authenticate, (req, res) =>
  authController.setup2fa(req, res),
);
router.post("/2fa/verify-setup", authenticate, (req, res) =>
  authController.verifySetup2fa(req, res),
);

export default router;
