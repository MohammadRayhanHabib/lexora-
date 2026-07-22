import { ObjectId } from "mongodb";
import { AppDataSource } from "../../config/database";
import { getTransactionState, setTransactionState } from "../../config/redis";
import { Payment } from "../../entities/Payment";
import { CreditLedger } from "../../entities/CreditLedger";
import { User } from "../../entities/User";
import { Subscription } from "../../entities/Subscription";
import {
  PaymentStatus,
  PaymentMethod,
  PackageType,
  CreditAction,
  SubscriptionPlan,
  SubscriptionStatus,
  AuditAction,
} from "../../types";
import { createAuditLog } from "../../middlewares/auditLogger";
import logger from "../../utils/logger";

const paymentRepo = () => AppDataSource.getMongoRepository(Payment);
const creditRepo = () => AppDataSource.getMongoRepository(CreditLedger);
const userRepo = () => AppDataSource.getMongoRepository(User);
const subRepo = () => AppDataSource.getMongoRepository(Subscription);

// Credit packages
const CREDIT_PACKAGES: Record<string, { credits: number; price: number }> = {
  basic_5: { credits: 5, price: 500 },
  standard_12: { credits: 12, price: 1000 },
  premium_25: { credits: 25, price: 1800 },
};

// Subscription packages
const SUB_PACKAGES: Record<
  string,
  {
    plan: SubscriptionPlan;
    price: number;
    durationDays: number;
    practiceTests: number;
    mockTests: number;
  }
> = {
  basic_monthly: {
    plan: SubscriptionPlan.BASIC,
    price: 500,
    durationDays: 30,
    practiceTests: 30,
    mockTests: 5,
  },
  premium_monthly: {
    plan: SubscriptionPlan.PREMIUM,
    price: 1200,
    durationDays: 30,
    practiceTests: -1,
    mockTests: 20,
  }, // -1 = unlimited
  enterprise_monthly: {
    plan: SubscriptionPlan.ENTERPRISE,
    price: 2500,
    durationDays: 30,
    practiceTests: -1,
    mockTests: -1,
  },
};

export class PaymentService {
  /**
   * Create a payment record and initiate processing
   * Idempotent: If transactionId already exists, return existing payment
   */
  async createPayment(data: {
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    transactionId: string;
    packageType: PackageType;
    packageId?: string;
    quantity: number;
    promoCode?: string;
  }): Promise<Payment> {
    // Idempotency check: prevent duplicate payments
    const existingPayment = await paymentRepo().findOne({
      where: { transactionId: data.transactionId },
    });
    if (existingPayment) {
      logger.warn(`Duplicate payment attempt for txn: ${data.transactionId}`);
      return existingPayment;
    }

    // Check Redis for in-flight transaction
    const txnState = await getTransactionState(data.transactionId);
    if (txnState === "processing") {
      throw new Error("Transaction is already being processed");
    }

    // Set transaction state in Redis
    await setTransactionState(data.transactionId, "processing", 300);

    const payment = new Payment();
    payment.userId = data.userId;
    payment.amount = data.amount;
    payment.currency = data.currency;
    payment.paymentMethod = data.paymentMethod;
    payment.transactionId = data.transactionId;
    payment.packageType = data.packageType;
    payment.packageId = data.packageId;
    payment.quantity = data.quantity;
    payment.status = PaymentStatus.PENDING;
    payment.promoCode = data.promoCode;
    payment.isProcessed = false;

    const saved = await paymentRepo().save(payment);

    await createAuditLog({
      userId: data.userId,
      action: AuditAction.PAYMENT_INITIATED,
      resourceType: "payment",
      resourceId: saved._id.toString(),
      details: {
        amount: data.amount,
        transactionId: data.transactionId,
        packageType: data.packageType,
      },
    });

    return saved;
  }

  /**
   * Verify and complete a payment (called after payment gateway confirmation)
   * Idempotent: If already processed, skip credit addition
   */
  async verifyAndCompletePayment(
    transactionId: string,
    gatewayResponse?: string,
  ): Promise<Payment> {
    const payment = await paymentRepo().findOne({ where: { transactionId } });
    if (!payment) throw new Error("Payment not found");

    // Idempotency: already processed
    if (payment.isProcessed) {
      logger.warn(`Payment already processed: ${transactionId}`);
      return payment;
    }

    // Mark as completed
    payment.status = PaymentStatus.COMPLETED;
    payment.gatewayResponse = gatewayResponse;
    payment.isProcessed = true;
    payment.processedAt = new Date();
    await paymentRepo().save(payment);

    // Process based on package type
    switch (payment.packageType) {
      case PackageType.CREDITS:
        await this.addCredits(payment);
        break;
      case PackageType.SUBSCRIPTION:
        await this.activateSubscription(payment);
        break;
      case PackageType.VIDEO:
      case PackageType.BUNDLE:
        // Video/bundle purchase — entitlement managed separately
        break;
      case PackageType.BOOKING:
        // Booking payment confirmed
        break;
    }

    // Clean up Redis transaction state
    await setTransactionState(transactionId, "completed", 3600);

    await createAuditLog({
      userId: payment.userId,
      action: AuditAction.PAYMENT_COMPLETED,
      resourceType: "payment",
      resourceId: payment._id.toString(),
      details: { amount: payment.amount, packageType: payment.packageType },
    });

    return payment;
  }

  /**
   * Mark payment as failed
   */
  async failPayment(transactionId: string, reason?: string): Promise<Payment> {
    const payment = await paymentRepo().findOne({ where: { transactionId } });
    if (!payment) throw new Error("Payment not found");

    if (payment.isProcessed) return payment; // Already processed

    payment.status = PaymentStatus.FAILED;
    payment.gatewayResponse = reason;
    await paymentRepo().save(payment);

    await setTransactionState(transactionId, "failed", 3600);

    await createAuditLog({
      userId: payment.userId,
      action: AuditAction.PAYMENT_FAILED,
      resourceType: "payment",
      resourceId: payment._id.toString(),
      details: { reason },
    });

    return payment;
  }

  /**
   * Get user's payment history
   */
  async getUserPayments(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ payments: Payment[]; total: number }> {
    const [payments, total] = await paymentRepo().findAndCount({
      where: { userId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { payments, total };
  }

  /**
   * Get credit ledger for user
   */
  async getCreditLedger(
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ entries: CreditLedger[]; total: number }> {
    const [entries, total] = await creditRepo().findAndCount({
      where: { userId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { entries, total };
  }

  /**
   * Get all payments (admin)
   */
  async getAllPayments(
    page: number = 1,
    limit: number = 50,
    status?: PaymentStatus,
  ): Promise<{ payments: Payment[]; total: number }> {
    const where: any = {};
    if (status) where.status = status;

    const [payments, total] = await paymentRepo().findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { payments, total };
  }

  // ─── Internal helpers ───────────────────────────────────

  private async addCredits(payment: Payment): Promise<void> {
    const packageInfo = payment.packageId
      ? CREDIT_PACKAGES[payment.packageId]
      : null;
    const credits = packageInfo
      ? packageInfo.credits * payment.quantity
      : payment.quantity;

    const user = await userRepo().findOne({
      where: { _id: new ObjectId(payment.userId) as any },
    });
    if (!user) throw new Error("User not found");

    const newBalance = user.creditBalance + credits;
    await userRepo().updateOne(
      { _id: new ObjectId(payment.userId) },
      { $set: { creditBalance: newBalance } },
    );

    // Immutable ledger entry
    const ledger = new CreditLedger();
    ledger.userId = payment.userId;
    ledger.action = CreditAction.ADDED;
    ledger.amount = credits;
    ledger.balanceAfter = newBalance;
    ledger.reason = `Credit purchase via ${payment.paymentMethod}`;
    ledger.referenceId = payment._id.toString();
    ledger.referenceType = "payment";
    await creditRepo().save(ledger);

    await createAuditLog({
      userId: payment.userId,
      action: AuditAction.CREDIT_ADDED,
      resourceType: "credit_ledger",
      details: { credits, newBalance, paymentId: payment._id.toString() },
    });
  }

  private async activateSubscription(payment: Payment): Promise<void> {
    const packageInfo = payment.packageId
      ? SUB_PACKAGES[payment.packageId]
      : null;
    if (!packageInfo) {
      logger.error(`Unknown subscription package: ${payment.packageId}`);
      return;
    }

    // Deactivate existing subscriptions
    await subRepo().updateMany(
      { userId: payment.userId, status: SubscriptionStatus.ACTIVE },
      { $set: { status: SubscriptionStatus.EXPIRED } },
    );

    const sub = new Subscription();
    sub.userId = payment.userId;
    sub.plan = packageInfo.plan;
    sub.status = SubscriptionStatus.ACTIVE;
    sub.startDate = new Date();
    sub.endDate = new Date(
      Date.now() + packageInfo.durationDays * 24 * 60 * 60 * 1000,
    );
    sub.paymentId = payment._id.toString();
    sub.practiceTestsAllowed = packageInfo.practiceTests;
    sub.mockTestsAllowed = packageInfo.mockTests;
    sub.practiceTestsUsed = 0;
    sub.mockTestsUsed = 0;

    await subRepo().save(sub);

    await createAuditLog({
      userId: payment.userId,
      action: AuditAction.SUBSCRIPTION_CHANGED,
      resourceType: "subscription",
      details: {
        plan: packageInfo.plan,
        durationDays: packageInfo.durationDays,
      },
    });
  }
}

export const paymentService = new PaymentService();
