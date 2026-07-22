import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../types";
import { ApiResponse } from "../../utils/response";
import { EnrollmentType, EnrolledModule } from "../../entities/Enrollment";
import * as svc from "./enrollment.service";

// ─── Student: get my enrollments ─────────────────────────────────────────────
export async function getMyEnrollments(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const enrollments = await svc.getMyEnrollments(req.user!.id);
    ApiResponse.success(res, enrollments);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

// ─── Student: enroll ─────────────────────────────────────────────────────────
export async function enroll(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const { type, module, expiresInDays } = req.body as {
      type: EnrollmentType;
      module?: EnrolledModule;
      expiresInDays?: number;
    };

    if (!type || !Object.values(EnrollmentType).includes(type)) {
      ApiResponse.badRequest(res, "Invalid enrollment type");
      return;
    }

    if (
      type === EnrollmentType.INDIVIDUAL_MODULE &&
      (!module || !Object.values(EnrolledModule).includes(module))
    ) {
      ApiResponse.badRequest(
        res,
        "A valid module (reading/listening/writing/speaking) is required for individual module enrollment",
      );
      return;
    }

    const enrollment = await svc.enroll(
      req.user!.id,
      type,
      module,
      expiresInDays,
    );
    ApiResponse.created(res, enrollment, "Enrolled successfully");
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

// ─── Student: unenroll ───────────────────────────────────────────────────────
export async function unenroll(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const { type, module } = req.body as {
      type: EnrollmentType;
      module?: EnrolledModule;
    };

    if (!type || !Object.values(EnrollmentType).includes(type)) {
      ApiResponse.badRequest(res, "Invalid enrollment type");
      return;
    }

    await svc.unenroll(
      req.user!.id,
      type as EnrollmentType,
      module as EnrolledModule | undefined,
    );
    ApiResponse.success(res, null, "Unenrolled successfully");
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

// ─── Admin: list all enrollments ─────────────────────────────────────────────
export async function adminListEnrollments(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { userId, type } = req.query as {
      userId?: string;
      type?: EnrollmentType;
    };
    const enrollments = await svc.adminListEnrollments({ userId, type });
    ApiResponse.success(res, enrollments);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

// ─── Admin: delete enrollment ────────────────────────────────────────────────
export async function adminDeleteEnrollment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await svc.adminDeleteEnrollment(req.params.id);
    ApiResponse.success(res, null, "Enrollment deleted");
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}
