import { ObjectId } from "mongodb";
import { AppDataSource } from "../../config/database";
import { User } from "../../entities/User";
import { Subscription } from "../../entities/Subscription";
import { Payment } from "../../entities/Payment";
import { CreditLedger } from "../../entities/CreditLedger";
import { Attempt } from "../../entities/Attempt";
import { ReviewRequest } from "../../entities/ReviewRequest";
import { AuditLog } from "../../entities/AuditLog";
import {
  UserRole,
  UserStatus,
  SubscriptionStatus,
  CreditAction,
  AuditAction,
  PaymentStatus,
} from "../../types";
import { createAuditLog } from "../../middlewares/auditLogger";
import logger from "../../utils/logger";

const userRepo = () => AppDataSource.getMongoRepository(User);
const subRepo = () => AppDataSource.getMongoRepository(Subscription);
const paymentRepo = () => AppDataSource.getMongoRepository(Payment);
const creditRepo = () => AppDataSource.getMongoRepository(CreditLedger);
const attemptRepo = () => AppDataSource.getMongoRepository(Attempt);
const reviewRepo = () => AppDataSource.getMongoRepository(ReviewRequest);
const auditRepo = () => AppDataSource.getMongoRepository(AuditLog);

export class AdminService {
  // ─── User Management ────────────────────────────────────

  async listUsers(
    page: number = 1,
    limit: number = 50,
    search?: string,
    role?: string,
  ): Promise<{ users: Partial<User>[]; total: number }> {
    const where: any = {};
    if (search) {
      where.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const [users, total] = await userRepo().findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const safeUsers = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      creditBalance: u.creditBalance,
      isEmailVerified: u.isEmailVerified,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));

    return { users: safeUsers, total };
  }

  async updateUserStatus(
    userId: string,
    isActive: boolean,
    adminId: string,
  ): Promise<void> {
    const status = isActive ? UserStatus.ACTIVE : UserStatus.SUSPENDED;
    await userRepo().updateOne(
      { _id: new ObjectId(userId) },
      { $set: { status, updatedAt: new Date() } },
    );

    await createAuditLog({
      userId: adminId,
      action: isActive
        ? AuditAction.USER_ACTIVATED
        : AuditAction.USER_SUSPENDED,
      resourceType: "user",
      resourceId: userId,
      details: { isActive },
    });
  }

  async updateUserRole(
    userId: string,
    role: UserRole,
    adminId: string,
  ): Promise<void> {
    await userRepo().updateOne(
      { _id: new ObjectId(userId) },
      { $set: { role, updatedAt: new Date() } },
    );

    await createAuditLog({
      userId: adminId,
      action: AuditAction.USER_ACTIVATED,
      resourceType: "user",
      resourceId: userId,
      details: { newRole: role },
    });
  }

  // ─── Subscription Management ────────────────────────────

  async manageSubscription(
    userId: string,
    action: "extend" | "suspend" | "activate",
    days: number = 0,
    adminId: string,
  ): Promise<void> {
    const sub = await subRepo().findOne({
      where: { userId },
      order: { createdAt: "DESC" },
    });
    if (!sub) throw new Error("No subscription found for user");

    switch (action) {
      case "extend":
        sub.endDate = new Date(
          sub.endDate.getTime() + days * 24 * 60 * 60 * 1000,
        );
        sub.status = SubscriptionStatus.ACTIVE;
        break;
      case "suspend":
        sub.status = SubscriptionStatus.SUSPENDED;
        break;
      case "activate":
        sub.status = SubscriptionStatus.ACTIVE;
        break;
    }

    await subRepo().save(sub);

    await createAuditLog({
      userId: adminId,
      action: AuditAction.SUBSCRIPTION_CHANGED,
      resourceType: "subscription",
      resourceId: sub._id.toString(),
      details: { action, days, targetUserId: userId },
    });
  }

  // ─── Review Queue Management ────────────────────────────

  async assignReviewer(
    reviewRequestId: string,
    reviewerId: string,
    adminId: string,
  ): Promise<void> {
    const { reviewService } = await import("../review/review.service");
    await reviewService.assignReviewer(reviewRequestId, reviewerId, adminId);
  }

  async getReviewQueue(status?: string): Promise<ReviewRequest[]> {
    const where: any = {};
    if (status) where.status = status;
    return reviewRepo().find({ where, order: { createdAt: "ASC" } });
  }

  // ─── Attempt History ────────────────────────────────────

  async getUserAttempts(userId: string): Promise<Attempt[]> {
    return attemptRepo().find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  // ─── Payment & Credit Ledger ────────────────────────────

  async getPaymentLedger(
    page: number = 1,
    limit: number = 50,
  ): Promise<{ payments: Payment[]; total: number }> {
    const [payments, total] = await paymentRepo().findAndCount({
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { payments, total };
  }

  async getCreditLedger(
    userId?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ entries: CreditLedger[]; total: number }> {
    const where: any = {};
    if (userId) where.userId = userId;

    const [entries, total] = await creditRepo().findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { entries, total };
  }

  async manualCreditAdjustment(
    userId: string,
    amount: number,
    action: "add" | "deduct",
    reason: string,
    adminId: string,
  ): Promise<void> {
    const user = await userRepo().findOne({
      where: { _id: new ObjectId(userId) as any },
    });
    if (!user) throw new Error("User not found");

    let newBalance: number;
    let creditAction: CreditAction;

    if (action === "add") {
      newBalance = user.creditBalance + amount;
      creditAction = CreditAction.ADDED;
    } else {
      if (user.creditBalance < amount) throw new Error("Insufficient credits");
      newBalance = user.creditBalance - amount;
      creditAction = CreditAction.DEDUCTED;
    }

    await userRepo().updateOne(
      { _id: new ObjectId(userId) },
      { $set: { creditBalance: newBalance } },
    );

    const ledger = new CreditLedger();
    ledger.userId = userId;
    ledger.action = creditAction;
    ledger.amount = amount;
    ledger.balanceAfter = newBalance;
    ledger.reason = `Admin adjustment: ${reason}`;
    ledger.referenceType = "admin_adjustment";
    ledger.performedBy = adminId;
    await creditRepo().save(ledger);

    await createAuditLog({
      userId: adminId,
      action:
        action === "add"
          ? AuditAction.CREDIT_ADDED
          : AuditAction.CREDIT_DEDUCTED,
      resourceType: "credit_ledger",
      resourceId: userId,
      details: { amount, action, reason, newBalance },
    });
  }

  // ─── Promo Codes ────────────────────────────────────────
  // Promo codes stored in a simple collection — inline for now

  async createPromoCode(
    data: {
      code: string;
      discountPercent: number;
      maxUses: number;
      expiresAt: Date;
      applicableTo: string;
    },
    adminId: string,
  ): Promise<any> {
    const db = AppDataSource.manager;
    // Use raw MongoDB collection for promo codes
    const collection = (
      AppDataSource.mongoManager.queryRunner as any
    )?.databaseConnection
      ?.db()
      .collection("promo_codes");
    if (!collection) throw new Error("Database connection not available");

    const existing = await collection.findOne({ code: data.code });
    if (existing) throw new Error("Promo code already exists");

    const promo = {
      ...data,
      usedCount: 0,
      isActive: true,
      createdBy: adminId,
      createdAt: new Date(),
    };

    await collection.insertOne(promo);

    await createAuditLog({
      userId: adminId,
      action: AuditAction.SUBSCRIPTION_CHANGED,
      resourceType: "promo_code",
      details: data,
    });

    return promo;
  }

  async listPromoCodes(): Promise<any[]> {
    const collection = (
      AppDataSource.mongoManager.queryRunner as any
    )?.databaseConnection
      ?.db()
      .collection("promo_codes");
    if (!collection) return [];
    return collection.find({}).toArray();
  }

  // ─── Notifications ──────────────────────────────────────

  async sendNotification(
    userId: string,
    message: string,
    adminId: string,
  ): Promise<void> {
    // Store notification in a simple collection
    const collection = (
      AppDataSource.mongoManager.queryRunner as any
    )?.databaseConnection
      ?.db()
      .collection("notifications");
    if (!collection) throw new Error("Database connection not available");

    await collection.insertOne({
      userId,
      message,
      isRead: false,
      sentBy: adminId,
      createdAt: new Date(),
    });
  }

  async sendBulkNotification(message: string, adminId: string): Promise<void> {
    const users = await userRepo().find({
      where: { status: UserStatus.ACTIVE as any },
    });
    const collection = (
      AppDataSource.mongoManager.queryRunner as any
    )?.databaseConnection
      ?.db()
      .collection("notifications");
    if (!collection) throw new Error("Database connection not available");

    const notifications = users.map((u) => ({
      userId: u._id.toString(),
      message,
      isRead: false,
      sentBy: adminId,
      createdAt: new Date(),
    }));

    if (notifications.length > 0) {
      await collection.insertMany(notifications);
    }
  }

  // ─── Audit Logs ─────────────────────────────────────────

  async getAuditLogs(
    page: number = 1,
    limit: number = 100,
    userId?: string,
    action?: string,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [logs, total] = await auditRepo().findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { logs, total };
  }

  // ─── Dashboard Stats ───────────────────────────────────

  async getDashboardStats(): Promise<Record<string, any>> {
    const totalUsers = await userRepo().count({});
    const activeUsers = await userRepo().count({
      where: { status: UserStatus.ACTIVE as any },
    });
    const totalAttempts = await attemptRepo().count({});
    const pendingReviews = await reviewRepo().count({
      where: { status: "pending" as any },
    });
    const totalPayments = await paymentRepo().count({});

    // Aggregate total revenue from completed payments
    const completedPayments = await paymentRepo().find({
      where: { status: PaymentStatus.COMPLETED as any },
    });
    const totalRevenue = completedPayments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0,
    );

    return {
      totalUsers,
      activeUsers,
      totalAttempts,
      pendingReviews,
      totalPayments,
      totalRevenue,
    };
  }
}

export const adminService = new AdminService();
