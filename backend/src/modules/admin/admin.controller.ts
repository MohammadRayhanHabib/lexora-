import { Response } from "express";
import { adminService } from "./admin.service";
import { ApiResponse } from "../../utils/response";
import {
  validate,
  updateUserStatusSchema,
  assignReviewerSchema,
  manageSubscriptionSchema,
  createPromoCodeSchema,
} from "../../utils/validators";
import { AuthenticatedRequest, UserRole } from "../../types";

export class AdminController {
  /** GET /api/admin/dashboard */
  async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();
      ApiResponse.success(res, stats);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/admin/users */
  async listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string | undefined;
      const role = req.query.role as string | undefined;
      const { users, total } = await adminService.listUsers(
        page,
        limit,
        search,
        role,
      );
      ApiResponse.paginated(res, users, total, page, limit);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** PUT /api/admin/users/:userId/status  (also /users/status legacy) */
  async updateUserStatus(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      // Support both path-param style (/users/:userId/status) and body style
      const userId = req.params.userId ?? req.body.userId;
      if (!userId) {
        ApiResponse.badRequest(res, "userId is required");
        return;
      }
      // Frontend sends { status: "active"|"suspended" }, legacy sends { isActive: bool }
      let isActive: boolean;
      if (typeof req.body.isActive === "boolean") {
        isActive = req.body.isActive;
      } else {
        isActive = req.body.status === "active";
      }
      await adminService.updateUserStatus(userId, isActive, req.user!.id);
      ApiResponse.success(res, null, "User status updated");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** PUT /api/admin/users/:userId/role  (also /users/role legacy) */
  async updateUserRole(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.params.userId ?? req.body.userId;
      const { role } = req.body;
      if (!userId || !role) {
        ApiResponse.badRequest(res, "userId and role required");
        return;
      }
      await adminService.updateUserRole(userId, role, req.user!.id);
      ApiResponse.success(res, null, "User role updated");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** PUT /api/admin/subscriptions */
  async manageSubscription(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { error, value } = validate(manageSubscriptionSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }
      await adminService.manageSubscription(
        value.userId,
        value.action,
        value.days,
        req.user!.id,
      );
      ApiResponse.success(res, null, "Subscription updated");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/admin/reviews/assign */
  async assignReviewer(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { error, value } = validate(assignReviewerSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }
      await adminService.assignReviewer(
        value.reviewRequestId,
        value.reviewerId,
        req.user!.id,
      );
      ApiResponse.success(res, null, "Reviewer assigned");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/admin/reviews/queue */
  async getReviewQueue(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const reviews = await adminService.getReviewQueue(status);
      ApiResponse.success(res, reviews);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/admin/attempts/:userId */
  async getUserAttempts(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const attempts = await adminService.getUserAttempts(req.params.userId);
      ApiResponse.success(res, attempts);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/admin/payments */
  async getPaymentLedger(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const { payments, total } = await adminService.getPaymentLedger(
        page,
        limit,
      );
      ApiResponse.paginated(res, payments, total, page, limit);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/admin/credits */
  async getCreditLedger(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.query.userId as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const { entries, total } = await adminService.getCreditLedger(
        userId,
        page,
        limit,
      );
      ApiResponse.paginated(res, entries, total, page, limit);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/admin/credits/adjust */
  async adjustCredits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, amount, action, reason } = req.body;
      if (!userId || !amount || !action || !reason) {
        ApiResponse.badRequest(
          res,
          "userId, amount, action, and reason are required",
        );
        return;
      }
      await adminService.manualCreditAdjustment(
        userId,
        amount,
        action,
        reason,
        req.user!.id,
      );
      ApiResponse.success(res, null, "Credits adjusted");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** POST /api/admin/promo-codes */
  async createPromoCode(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { error, value } = validate(createPromoCodeSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }
      const promo = await adminService.createPromoCode(value, req.user!.id);
      ApiResponse.created(res, promo, "Promo code created");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** GET /api/admin/promo-codes */
  async listPromoCodes(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const codes = await adminService.listPromoCodes();
      ApiResponse.success(res, codes);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/admin/notifications */
  async sendNotification(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { userId, message } = req.body;
      if (!message) {
        ApiResponse.badRequest(res, "message is required");
        return;
      }

      if (userId) {
        await adminService.sendNotification(userId, message, req.user!.id);
      } else {
        await adminService.sendBulkNotification(message, req.user!.id);
      }
      ApiResponse.success(res, null, "Notification sent");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/admin/audit-logs */
  async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const userId = req.query.userId as string | undefined;
      const action = req.query.action as string | undefined;
      const { logs, total } = await adminService.getAuditLogs(
        page,
        limit,
        userId,
        action,
      );
      ApiResponse.paginated(res, logs, total, page, limit);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }
}

export const adminController = new AdminController();
