import { AppDataSource } from "../../config/database";
import {
  Enrollment,
  EnrollmentType,
  EnrolledModule,
} from "../../entities/Enrollment";
import { ObjectId } from "mongodb";

const enrollmentRepo = () => AppDataSource.getRepository(Enrollment);

// ─── Get all active enrollments for a user ────────────────────────────────
export async function getMyEnrollments(userId: string): Promise<Enrollment[]> {
  return enrollmentRepo().find({
    where: { userId, isActive: true } as any,
  });
}

// ─── Check if user is enrolled in a specific type (+ optional module) ────────
export async function isEnrolled(
  userId: string,
  type: EnrollmentType,
  module?: EnrolledModule,
): Promise<boolean> {
  const query: any = { userId, type, isActive: true };
  if (type === EnrollmentType.INDIVIDUAL_MODULE && module) {
    query.module = module;
  }

  const enrollment = await enrollmentRepo().findOne({ where: query });
  if (!enrollment) return false;

  // Check expiry
  if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
    await enrollmentRepo().update(enrollment._id as any, { isActive: false });
    return false;
  }

  return true;
}

// ─── Enroll a user ───────────────────────────────────────────────────────────
export async function enroll(
  userId: string,
  type: EnrollmentType,
  module?: EnrolledModule,
  expiresInDays?: number,
): Promise<Enrollment> {
  // For individual module, module is required
  if (type === EnrollmentType.INDIVIDUAL_MODULE && !module) {
    throw new Error("Module is required for individual module enrollment");
  }
  // For non-individual types, module must not be set
  if (type !== EnrollmentType.INDIVIDUAL_MODULE && module) {
    module = undefined;
  }

  // Reactivate existing enrollment if found
  const existing = await enrollmentRepo().findOne({
    where: { userId, type, ...(module ? { module } : {}) } as any,
  });

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : undefined;

  if (existing) {
    existing.isActive = true;
    if (expiresAt !== undefined) existing.expiresAt = expiresAt;
    return enrollmentRepo().save(existing);
  }

  const enrollment = enrollmentRepo().create({
    userId,
    type,
    module,
    isActive: true,
    expiresAt,
  });

  return enrollmentRepo().save(enrollment);
}

// ─── Unenroll (soft-delete) ──────────────────────────────────────────────────
export async function unenroll(
  userId: string,
  type: EnrollmentType,
  module?: EnrolledModule,
): Promise<void> {
  const query: any = { userId, type, isActive: true };
  if (type === EnrollmentType.INDIVIDUAL_MODULE && module) {
    query.module = module;
  }

  const enrollment = await enrollmentRepo().findOne({ where: query });
  if (!enrollment) throw new Error("Enrollment not found");

  await enrollmentRepo().update(enrollment._id as any, { isActive: false });
}

// ─── Admin: list all enrollments ─────────────────────────────────────────────
export async function adminListEnrollments(filter?: {
  userId?: string;
  type?: EnrollmentType;
}): Promise<Enrollment[]> {
  const where: any = {};
  if (filter?.userId) where.userId = filter.userId;
  if (filter?.type) where.type = filter.type;

  return enrollmentRepo().find({ where, order: { enrolledAt: "DESC" } as any });
}

// ─── Admin: delete by ID ─────────────────────────────────────────────────────
export async function adminDeleteEnrollment(id: string): Promise<void> {
  await enrollmentRepo().delete(new ObjectId(id) as any);
}
