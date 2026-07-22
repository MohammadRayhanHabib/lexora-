import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { OAuth2Client } from "google-auth-library";
import { AppDataSource } from "../../config/database";
import { env } from "../../config/env";
import { setSession, deleteSession } from "../../config/redis";
import { User } from "../../entities/User";
import { Subscription } from "../../entities/Subscription";
import {
  UserRole,
  UserStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  AuditAction,
} from "../../types";
import { createAuditLog } from "../../middlewares/auditLogger";
import logger from "../../utils/logger";

const userRepo = () => AppDataSource.getMongoRepository(User);
const subRepo = () => AppDataSource.getMongoRepository(Subscription);

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<{ user: Partial<User> }> {
    // Check if user already exists
    const existing = await userRepo().findOne({ where: { email: data.email } });
    if (existing) {
      throw new Error("Email already registered");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const user = new User();
    user.name = data.name;
    user.email = data.email;
    user.password = hashedPassword;
    user.phone = data.phone;
    user.role = UserRole.STUDENT;
    user.status = UserStatus.ACTIVE;
    user.creditBalance = 0;
    user.isEmailVerified = false;

    const saved = await userRepo().save(user);

    // Create free subscription
    const sub = new Subscription();
    sub.userId = saved._id.toString();
    sub.plan = SubscriptionPlan.FREE;
    sub.status = SubscriptionStatus.ACTIVE;
    sub.startDate = new Date();
    sub.endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    sub.practiceTestsAllowed = 5;
    sub.mockTestsAllowed = 1;
    sub.practiceTestsUsed = 0;
    sub.mockTestsUsed = 0;
    await subRepo().save(sub);

    await createAuditLog({
      userId: saved._id.toString(),
      action: AuditAction.REGISTER,
      resourceType: "user",
      resourceId: saved._id.toString(),
    });

    return {
      user: {
        _id: saved._id,
        name: saved.name,
        email: saved.email,
        role: saved.role,
        status: saved.status,
        creditBalance: saved.creditBalance,
      },
    };
  }

  /**
   * Google OAuth: Verify ID token, find-or-create user, issue JWT.
   */
  async googleAuth(data: {
    idToken: string;
    fingerprint: string;
    ipAddress?: string;
  }): Promise<{ token: string; user: Partial<User> }> {
    // Verify the Google ID token
    const oauthClient = new OAuth2Client(env.googleClientId);
    let googleProfile: {
      sub: string;
      email: string;
      name: string;
      picture?: string;
    };
    try {
      const ticket = await oauthClient.verifyIdToken({
        idToken: data.idToken,
        audience: env.googleClientId || undefined,
      });
      const payload = ticket.getPayload();
      if (!payload) throw new Error("Empty token payload");
      googleProfile = {
        sub: payload.sub,
        email: payload.email || "",
        name: payload.name || "",
        picture: payload.picture,
      };
    } catch {
      throw new Error("Invalid or expired Google token");
    }

    const { sub: googleId, email, name, picture } = googleProfile;
    if (!email) throw new Error("Could not retrieve email from Google");

    // Find or create user
    let user = await userRepo().findOne({ where: { email } });

    if (!user) {
      // New user — register via Google
      const newUser = new User();
      newUser.name = name || email.split("@")[0];
      newUser.email = email;
      newUser.password = await bcrypt.hash(
        Math.random().toString(36) + Date.now(),
        12,
      );
      newUser.googleId = googleId;
      newUser.role = UserRole.STUDENT;
      newUser.status = UserStatus.ACTIVE;
      newUser.creditBalance = 0;
      newUser.isEmailVerified = true;
      if (picture) newUser.profileImage = picture;

      user = await userRepo().save(newUser);

      // Free subscription
      const sub = new Subscription();
      sub.userId = user._id.toString();
      sub.plan = SubscriptionPlan.FREE;
      sub.status = SubscriptionStatus.ACTIVE;
      sub.startDate = new Date();
      sub.endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      sub.practiceTestsAllowed = 5;
      sub.mockTestsAllowed = 1;
      sub.practiceTestsUsed = 0;
      sub.mockTestsUsed = 0;
      await subRepo().save(sub);

      await createAuditLog({
        userId: user._id.toString(),
        action: AuditAction.REGISTER,
        resourceType: "user",
        resourceId: user._id.toString(),
      });
    } else {
      if (user.status !== UserStatus.ACTIVE) {
        throw new Error("Account is suspended or inactive");
      }
      // Link googleId if missing
      if (!user.googleId) {
        await userRepo().updateOne({ _id: user._id }, { $set: { googleId } });
      }
    }

    // Issue JWT
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn as any },
    );
    const expirySeconds = 7 * 24 * 60 * 60;
    await setSession(
      user._id.toString(),
      data.fingerprint,
      token,
      expirySeconds,
    );
    await userRepo().updateOne(
      { _id: user._id },
      {
        $set: {
          currentFingerprint: data.fingerprint,
          lastLoginAt: new Date(),
          lastLoginIp: data.ipAddress,
        },
      },
    );
    await createAuditLog({
      userId: user._id.toString(),
      action: AuditAction.LOGIN,
      details: { method: "google", fingerprint: data.fingerprint },
      ipAddress: data.ipAddress,
    });

    return {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        creditBalance: user.creditBalance,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  /**
   * Login: Validates credentials.
   * - 2FA disabled (default): issues JWT directly.
   * - 2FA enabled: sends OTP and waits for verify-otp step.
   */
  async login(data: {
    email: string;
    password: string;
    fingerprint: string;
    ipAddress?: string;
  }): Promise<
    | { token: string; user: Partial<User> }
    | { otpRequired: true; email: string }
  > {
    const user = await userRepo().findOne({ where: { email: data.email } });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new Error("Account is suspended or inactive");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      await createAuditLog({
        userId: user._id.toString(),
        action: AuditAction.LOGIN_FAILED,
        details: { reason: "Invalid password" },
        ipAddress: data.ipAddress,
      });
      throw new Error("Invalid email or password");
    }

    // ── 2FA disabled: issue token directly ──────────────
    if (!user.twoFactorEnabled) {
      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role },
        env.jwtSecret,
        { expiresIn: env.jwtExpiresIn as any },
      );
      const expirySeconds = 7 * 24 * 60 * 60;
      await setSession(
        user._id.toString(),
        data.fingerprint,
        token,
        expirySeconds,
      );
      await userRepo().updateOne(
        { _id: user._id },
        {
          $set: {
            currentFingerprint: data.fingerprint,
            lastLoginAt: new Date(),
            lastLoginIp: data.ipAddress,
            isEmailVerified: true,
          },
        },
      );
      await createAuditLog({
        userId: user._id.toString(),
        action: AuditAction.LOGIN,
        details: { fingerprint: data.fingerprint },
        ipAddress: data.ipAddress,
      });
      return {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          creditBalance: user.creditBalance,
          twoFactorEnabled: user.twoFactorEnabled,
        },
      };
    }

    // ── 2FA enabled: prompt for Google Authenticator code ──
    await createAuditLog({
      userId: user._id.toString(),
      action: AuditAction.OTP_SENT,
      details: { email: data.email, method: "totp" },
      ipAddress: data.ipAddress,
    });
    return { otpRequired: true, email: data.email };
  }

  /**
   * Login Step 2: Verify Google Authenticator TOTP and issue token
   */
  async verifyOTP(data: {
    email: string;
    otp: string;
    fingerprint: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ token: string; user: Partial<User> }> {
    const user = await userRepo().findOne({ where: { email: data.email } });
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.twoFactorSecret) {
      throw new Error("Two-factor authentication is not configured");
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: data.otp,
      window: 1,
    });

    if (!verified) {
      throw new Error(
        "Invalid authenticator code. Please check your app and try again.",
      );
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn as any },
    );

    // Store session with fingerprint (single-device enforcement)
    const expirySeconds = 7 * 24 * 60 * 60; // 7 days
    await setSession(
      user._id.toString(),
      data.fingerprint,
      token,
      expirySeconds,
    );

    // Update user fingerprint and last login
    await userRepo().updateOne(
      { _id: user._id },
      {
        $set: {
          currentFingerprint: data.fingerprint,
          lastLoginAt: new Date(),
          lastLoginIp: data.ipAddress,
          isEmailVerified: true,
        },
      },
    );

    await createAuditLog({
      userId: user._id.toString(),
      action: AuditAction.LOGIN,
      details: { fingerprint: data.fingerprint },
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      fingerprint: data.fingerprint,
    });

    return {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        creditBalance: user.creditBalance,
      },
    };
  }

  /**
   * Logout: Remove session
   */
  async logout(userId: string, ipAddress?: string): Promise<void> {
    await deleteSession(userId);

    await createAuditLog({
      userId,
      action: AuditAction.LOGOUT,
      ipAddress,
    });
  }

  /**
   * Get current user profile
   */
  async getProfile(
    userId: string,
  ): Promise<Partial<User> & { subscription?: Partial<Subscription> }> {
    const user = await userRepo().findOne({
      where: { _id: new ObjectId(userId) as any },
    });
    if (!user) {
      throw new Error("User not found");
    }

    const subscription = await subRepo().findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE as any },
    });

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      country: user.country,
      targetBand: user.targetBand,
      examDate: user.examDate,
      website: user.website,
      profileImage: user.profileImage,
      role: user.role,
      status: user.status,
      creditBalance: user.creditBalance,
      isEmailVerified: user.isEmailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            practiceTestsAllowed: subscription.practiceTestsAllowed,
            mockTestsAllowed: subscription.mockTestsAllowed,
            practiceTestsUsed: subscription.practiceTestsUsed,
            mockTestsUsed: subscription.mockTestsUsed,
          }
        : undefined,
    };
  }

  /**
   * Update profile
   */
  async updateProfile(
    userId: string,
    data: {
      name?: string;
      phone?: string;
      country?: string;
      targetBand?: number;
      examDate?: string;
      website?: string;
    },
  ): Promise<Partial<User>> {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.targetBand !== undefined) updateData.targetBand = data.targetBand;
    if (data.examDate !== undefined)
      updateData.examDate = data.examDate ? new Date(data.examDate) : null;
    if (data.website !== undefined) updateData.website = data.website;
    await userRepo().updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData },
    );
    const user = await userRepo().findOne({
      where: { _id: new ObjectId(userId) as any },
    });
    return {
      _id: user!._id,
      name: user!.name,
      email: user!.email,
      phone: user!.phone,
      country: user!.country,
      targetBand: user!.targetBand,
      examDate: user!.examDate,
      website: user!.website,
      profileImage: user!.profileImage,
    };
  }

  async updateProfileImage(
    userId: string,
    profileImage: string | null,
  ): Promise<void> {
    await userRepo().updateOne(
      { _id: new ObjectId(userId) },
      { $set: { profileImage: profileImage ?? null, updatedAt: new Date() } },
    );
  }

  /**
   * Setup TOTP: generate secret + QR code (unverified)
   */
  async setup2fa(
    userId: string,
  ): Promise<{ qrCodeUrl: string; secret: string }> {
    const user = await userRepo().findOne({
      where: { _id: new ObjectId(userId) as any },
    });
    if (!user) throw new Error("User not found");

    const secret = speakeasy.generateSecret({
      name: `Lexora (${user.email})`,
      issuer: "Lexora",
      length: 20,
    });

    // Persist secret (not enabled yet — enabled after verify)
    await userRepo().updateOne(
      { _id: new ObjectId(userId) },
      { $set: { twoFactorSecret: secret.base32, updatedAt: new Date() } },
    );

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    return { qrCodeUrl, secret: secret.base32 };
  }

  /**
   * Verify TOTP code and activate 2FA
   */
  async verifyAndEnable2fa(userId: string, token: string): Promise<void> {
    const user = await userRepo().findOne({
      where: { _id: new ObjectId(userId) as any },
    });
    if (!user) throw new Error("User not found");
    if (!user.twoFactorSecret)
      throw new Error("2FA setup not initiated. Please start setup first.");

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified)
      throw new Error(
        "Invalid authenticator code. Please check your app and try again.",
      );

    await userRepo().updateOne(
      { _id: new ObjectId(userId) },
      { $set: { twoFactorEnabled: true, updatedAt: new Date() } },
    );
  }

  /**
   * Disable two-factor authentication (clears secret)
   */
  async toggleTwoFactor(
    userId: string,
    enabled: boolean,
  ): Promise<{ twoFactorEnabled: boolean }> {
    if (enabled) {
      throw new Error(
        "Use the 2FA setup flow to enable two-factor authentication",
      );
    }
    await userRepo().updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: { twoFactorEnabled: false, updatedAt: new Date() },
        $unset: { twoFactorSecret: "" },
      },
    );
    return { twoFactorEnabled: false };
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await userRepo().findOne({
      where: { _id: new ObjectId(userId) as any },
    });
    if (!user) throw new Error("User not found");

    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) throw new Error("Current password is incorrect");

    const hashed = await bcrypt.hash(newPassword, 12);
    await userRepo().updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password: hashed, updatedAt: new Date() } },
    );
  }
}

export const authService = new AuthService();
