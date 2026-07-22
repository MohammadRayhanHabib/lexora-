import { Response } from "express";
import { mockExamService } from "./mockExam.service";
import { ApiResponse } from "../../utils/response";
import { AuthenticatedRequest } from "../../types";
import { MockExamAttemptStatus } from "../../entities/MockExamAttempt";

export class MockExamController {
  // ═══════════════════════════════════════════════
  // ADMIN — Exam CRUD
  // ═══════════════════════════════════════════════

  /** GET /api/mock-exam/admin/exams */
  async adminListExams(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const data = await mockExamService.adminListExams(page, limit);
      ApiResponse.success(res, data);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/mock-exam/admin/exams/:id */
  async adminGetExam(req: AuthenticatedRequest, res: Response) {
    try {
      const exam = await mockExamService.adminGetExam(req.params.id);
      ApiResponse.success(res, exam);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** POST /api/mock-exam/admin/exams */
  async adminCreateExam(req: AuthenticatedRequest, res: Response) {
    try {
      const { title } = req.body;
      if (!title) {
        ApiResponse.badRequest(res, "title is required");
        return;
      }
      const exam = await mockExamService.adminCreateExam(
        req.body,
        req.user!.id,
      );
      ApiResponse.created(res, exam, "Mock exam created");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** PUT /api/mock-exam/admin/exams/:id */
  async adminUpdateExam(req: AuthenticatedRequest, res: Response) {
    try {
      const updated = await mockExamService.adminUpdateExam(
        req.params.id,
        req.body,
      );
      ApiResponse.success(res, updated, "Mock exam updated");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** DELETE /api/mock-exam/admin/exams/:id */
  async adminDeleteExam(req: AuthenticatedRequest, res: Response) {
    try {
      await mockExamService.adminDeleteExam(req.params.id);
      ApiResponse.success(res, null, "Mock exam deleted");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  // ═══════════════════════════════════════════════
  // ADMIN — Attempts & Grading
  // ═══════════════════════════════════════════════

  /** GET /api/mock-exam/admin/attempts */
  async adminListAttempts(req: AuthenticatedRequest, res: Response) {
    try {
      const { examId, status } = req.query as Record<string, string>;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await mockExamService.adminListAttempts(
        examId,
        status,
        page,
        limit,
      );
      ApiResponse.success(res, data);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/mock-exam/admin/attempts/pending */
  async adminPendingReviews(req: AuthenticatedRequest, res: Response) {
    try {
      const attempts = await mockExamService.adminGetPendingReviews();
      ApiResponse.success(res, attempts);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/mock-exam/admin/attempts/:id */
  async adminGetAttempt(req: AuthenticatedRequest, res: Response) {
    try {
      const attempt = await mockExamService.adminGetAttempt(req.params.id);
      ApiResponse.success(res, attempt);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** POST /api/mock-exam/admin/attempts/:id/grade-writing */
  async adminGradeWriting(req: AuthenticatedRequest, res: Response) {
    try {
      const { writingBand, writingTask1Band, writingTask2Band, writingFeedback } =
        req.body;
      if (writingBand == null) {
        ApiResponse.badRequest(res, "writingBand is required");
        return;
      }
      const updated = await mockExamService.adminGradeWriting(
        req.params.id,
        req.user!.id,
        { writingBand, writingTask1Band, writingTask2Band, writingFeedback },
      );
      ApiResponse.success(res, updated, "Writing graded");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/mock-exam/admin/attempts/:id/grade-speaking */
  async adminGradeSpeaking(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        speakingBand,
        speakingPart1Band,
        speakingPart2Band,
        speakingPart3Band,
        speakingFeedback,
      } = req.body;
      if (speakingBand == null) {
        ApiResponse.badRequest(res, "speakingBand is required");
        return;
      }
      const updated = await mockExamService.adminGradeSpeaking(
        req.params.id,
        req.user!.id,
        {
          speakingBand,
          speakingPart1Band,
          speakingPart2Band,
          speakingPart3Band,
          speakingFeedback,
        },
      );
      ApiResponse.success(res, updated, "Speaking graded");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/mock-exam/admin/attempts/:id/publish */
  async adminPublishResult(req: AuthenticatedRequest, res: Response) {
    try {
      const updated = await mockExamService.adminPublishResult(req.params.id);
      ApiResponse.success(res, updated, "Result published");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/mock-exam/admin/analytics */
  async adminGetAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { examId } = req.query as { examId?: string };
      const data = await mockExamService.adminGetAnalytics(examId);
      ApiResponse.success(res, data);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  // ═══════════════════════════════════════════════
  // STUDENT
  // ═══════════════════════════════════════════════

  /** GET /api/mock-exam/exams */
  async listExams(req: AuthenticatedRequest, res: Response) {
    try {
      const exams = await mockExamService.listActiveExams();
      ApiResponse.success(res, exams);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/mock-exam/exams/:id */
  async getExam(req: AuthenticatedRequest, res: Response) {
    try {
      const exam = await mockExamService.getExamForStudent(req.params.id);
      ApiResponse.success(res, exam);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** POST /api/mock-exam/exams/:id/attempt */
  async startAttempt(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await mockExamService.startOrResumeAttempt(
        req.user!.id,
        req.params.id,
      );
      ApiResponse.created(res, result, "Mock exam attempt started");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** PATCH /api/mock-exam/attempts/:id */
  async updateAttempt(req: AuthenticatedRequest, res: Response) {
    try {
      const updated = await mockExamService.updateAttemptSection(
        req.params.id,
        req.user!.id,
        req.body,
      );
      ApiResponse.success(res, updated, "Attempt updated");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/mock-exam/attempts/:id */
  async getAttempt(req: AuthenticatedRequest, res: Response) {
    try {
      const attempt = await mockExamService.getAttempt(
        req.params.id,
        req.user!.id,
      );
      ApiResponse.success(res, attempt);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** GET /api/mock-exam/my-attempts */
  async myAttempts(req: AuthenticatedRequest, res: Response) {
    try {
      const attempts = await mockExamService.getUserAttempts(req.user!.id);
      ApiResponse.success(res, attempts);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }
}

export const mockExamController = new MockExamController();
