import { Response } from "express";
import { authService } from "./auth.service";
import { ApiResponse } from "../../utils/response";
import {
  validate,
  registerSchema,
  loginSchema,
  verifyOTPSchema,
} from "../../utils/validators";
import { AuthenticatedRequest } from "../../types";
import {
  deleteObjectFromObjectStorage,
  getObjectStorageKeyFromUrl,
  uploadBufferToObjectStorage,
} from "../../utils/objectStorage";
import { env } from "../../config/env";

export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = validate(registerSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }

      const result = await authService.register(value);
      ApiResponse.created(res, result, "Registration successful");
    } catch (err: any) {
      if (err.message === "Email already registered") {
        ApiResponse.conflict(res, err.message);
        return;
      }
      ApiResponse.error(res, err.message);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = validate(loginSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }

      const result = await authService.login({
        ...value,
        ipAddress: req.ip,
      });
      ApiResponse.success(res, result);
    } catch (err: any) {
      ApiResponse.unauthorized(res, err.message);
    }
  }

  /**
   * POST /api/auth/verify-otp
   */
  async verifyOTP(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = validate(verifyOTPSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }

      const result = await authService.verifyOTP({
        ...value,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      ApiResponse.success(res, result, "Login successful");
    } catch (err: any) {
      ApiResponse.unauthorized(res, err.message);
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await authService.logout(req.user!.id, req.ip);
      ApiResponse.success(res, null, "Logged out successfully");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /**
   * GET /api/auth/profile
   */
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const profile = await authService.getProfile(req.user!.id);
      ApiResponse.success(res, profile);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /**
   * PUT /api/auth/profile
   */
  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await authService.updateProfile(req.user!.id, req.body);
      ApiResponse.success(res, result, "Profile updated");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /**
   * PUT /api/auth/change-password
   */
  async changePassword(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        ApiResponse.badRequest(
          res,
          "Old password and new password are required",
        );
        return;
      }
      await authService.changePassword(req.user!.id, oldPassword, newPassword);
      ApiResponse.success(res, null, "Password changed successfully");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }
  /**
   * PUT /api/auth/toggle-2fa  — only used to DISABLE 2FA
   */
  async toggleTwoFactor(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== "boolean") {
        ApiResponse.badRequest(res, "'enabled' must be a boolean");
        return;
      }
      const result = await authService.toggleTwoFactor(req.user!.id, enabled);
      ApiResponse.success(res, result, "Two-factor authentication disabled");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /**
   * POST /api/auth/2fa/setup
   * Generates a TOTP secret + QR code data URL (does not enable yet).
   */
  async setup2fa(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await authService.setup2fa(req.user!.id);
      ApiResponse.success(
        res,
        result,
        "Scan the QR code with Google Authenticator",
      );
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /**
   * POST /api/auth/2fa/verify-setup
   * Confirms a TOTP code is valid and activates 2FA on the account.
   */
  async verifySetup2fa(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") {
        ApiResponse.badRequest(res, "'token' is required");
        return;
      }
      await authService.verifyAndEnable2fa(req.user!.id, token);
      ApiResponse.success(
        res,
        { twoFactorEnabled: true },
        "Two-factor authentication enabled",
      );
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /**
   * POST /api/auth/profile/photo
   */
  async uploadProfilePhoto(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        ApiResponse.badRequest(res, "No file uploaded");
        return;
      }

      const uploaded = await uploadBufferToObjectStorage({
        bucket: env.storagePicturesBucket,
        folder: "profile-photos",
        originalName: file.originalname,
        mimeType: file.mimetype,
        content: file.buffer,
      });

      const currentProfile = await authService.getProfile(req.user!.id);
      if (currentProfile.profileImage) {
        const previousKey = getObjectStorageKeyFromUrl(
          currentProfile.profileImage,
          env.storagePicturesBucket,
        );
        if (previousKey) {
          await deleteObjectFromObjectStorage({
            bucket: env.storagePicturesBucket,
            key: previousKey,
          });
        }
      }

      const imageUrl = uploaded.url;
      await authService.updateProfileImage(req.user!.id, imageUrl);
      ApiResponse.success(
        res,
        { profileImage: imageUrl },
        "Profile photo updated",
      );
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /**
   * DELETE /api/auth/profile/photo
   */
  async removeProfilePhoto(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const profile = await authService.getProfile(req.user!.id);
      if (profile.profileImage) {
        const previousKey = getObjectStorageKeyFromUrl(
          profile.profileImage,
          env.storagePicturesBucket,
        );
        if (previousKey) {
          await deleteObjectFromObjectStorage({
            bucket: env.storagePicturesBucket,
            key: previousKey,
          });
        }
      }
      await authService.updateProfileImage(req.user!.id, null);
      ApiResponse.success(res, { profileImage: null }, "Profile photo removed");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /**
   * POST /api/auth/google
   */
  async googleAuth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { idToken, fingerprint } = req.body;
      if (!idToken) {
        ApiResponse.badRequest(res, "idToken is required");
        return;
      }
      const result = await authService.googleAuth({
        idToken,
        fingerprint: fingerprint || "google-sso",
        ipAddress: req.ip,
      });
      ApiResponse.success(res, result, "Google login successful");
    } catch (err: any) {
      ApiResponse.unauthorized(res, err.message);
    }
  }
}

export const authController = new AuthController();
