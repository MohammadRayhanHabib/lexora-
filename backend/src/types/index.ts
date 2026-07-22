import { Request } from "express";

// ─── User Types ────────────────────────────────────────────
export enum UserRole {
  STUDENT = "student",
  REVIEWER = "reviewer",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

// ─── Test Types ────────────────────────────────────────────
export enum TestModule {
  LISTENING = "listening",
  READING = "reading",
  WRITING = "writing",
  SPEAKING = "speaking",
}

export enum TestType {
  PRACTICE = "practice",
  MOCK = "mock",
}

export enum AttemptStatus {
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  ABANDONED = "abandoned",
}

// ─── Review Types ──────────────────────────────────────────
export enum ReviewStatus {
  PENDING = "pending",
  ASSIGNED = "assigned",
  IN_REVIEW = "in_review",
  COMPLETED = "completed",
  REJECTED = "rejected",
}

// ─── Payment Types ─────────────────────────────────────────
export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum PaymentMethod {
  BKASH = "bkash",
  NAGAD = "nagad",
  CARD = "card",
  BANK = "bank",
}

export enum PackageType {
  CREDITS = "credits",
  SUBSCRIPTION = "subscription",
  VIDEO = "video",
  BUNDLE = "bundle",
  BOOKING = "booking",
}

// ─── Credit Ledger Types ───────────────────────────────────
export enum CreditAction {
  ADDED = "added",
  DEDUCTED = "deducted",
  REFUNDED = "refunded",
}

// ─── Support Types ─────────────────────────────────────────
export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

export enum TicketCategory {
  PAYMENT = "payment",
  TECHNICAL = "technical",
  REVIEW = "review",
  GENERAL = "general",
}

// ─── Booking Types ─────────────────────────────────────────
export enum BookingStatus {
  PENDING_PAYMENT = "pending_payment",
  PAID = "paid",
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

// ─── Subscription Types ────────────────────────────────────
export enum SubscriptionPlan {
  FREE = "free",
  BASIC = "basic",
  PREMIUM = "premium",
  ENTERPRISE = "enterprise",
}

export enum SubscriptionStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  SUSPENDED = "suspended",
  CANCELLED = "cancelled",
}

// ─── Audit Types ───────────────────────────────────────────
export enum AuditAction {
  LOGIN = "login",
  LOGOUT = "logout",
  LOGIN_FAILED = "login_failed",
  OTP_SENT = "otp_sent",
  OTP_VERIFIED = "otp_verified",
  REGISTER = "register",
  TEST_STARTED = "test_started",
  TEST_SUBMITTED = "test_submitted",
  REVIEW_REQUESTED = "review_requested",
  REVIEW_ASSIGNED = "review_assigned",
  REVIEW_COMPLETED = "review_completed",
  PAYMENT_INITIATED = "payment_initiated",
  PAYMENT_COMPLETED = "payment_completed",
  PAYMENT_FAILED = "payment_failed",
  CREDIT_ADDED = "credit_added",
  CREDIT_DEDUCTED = "credit_deducted",
  CREDIT_REFUNDED = "credit_refunded",
  USER_SUSPENDED = "user_suspended",
  USER_ACTIVATED = "user_activated",
  SUBSCRIPTION_CHANGED = "subscription_changed",
  VIDEO_PURCHASED = "video_purchased",
  BOOKING_CREATED = "booking_created",
  BOOKING_CONFIRMED = "booking_confirmed",
  TICKET_CREATED = "ticket_created",
  SECURITY_VIOLATION = "security_violation",
}

// ─── Request Extensions ────────────────────────────────────
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    fingerprint?: string;
  };
}
