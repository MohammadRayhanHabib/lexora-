import { Response } from "express";
import * as listeningService from "./listening.service";
import { ApiResponse } from "../../utils/response";
import { AuthenticatedRequest, UserRole } from "../../types";
import { ListeningTestMode } from "../../entities/ListeningAttempt";
import { uploadBufferToObjectStorage } from "../../utils/objectStorage";
import { env } from "../../config/env";

export class ListeningController {
  // ═══════════════════════════════════════════════
  // ADMIN — Tests
  // ═══════════════════════════════════════════════

  /** GET /api/listening/admin/tests */
  async adminListTests(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await listeningService.adminListTests(page, limit);
      ApiResponse.success(res, data);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/listening/admin/tests/:id */
  async adminGetTest(req: AuthenticatedRequest, res: Response) {
    try {
      const test = await listeningService.adminGetTest(req.params.id);
      ApiResponse.success(res, test);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** POST /api/listening/admin/map-image — map labelling image → object storage */
  async adminUploadMapImage(req: AuthenticatedRequest, res: Response) {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file?.buffer) {
        ApiResponse.badRequest(
          res,
          "Image file is required (field name: image)",
        );
        return;
      }

      const uploadResult = await uploadBufferToObjectStorage({
        bucket: env.storageListeningBucket,
        folder: "listening/maps",
        originalName: file.originalname,
        mimeType: file.mimetype,
        content: file.buffer,
      });

      ApiResponse.success(
        res,
        { url: uploadResult.url },
        "Map image uploaded",
      );
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/listening/admin/tests */
  async adminCreateTest(req: AuthenticatedRequest, res: Response) {
    try {
      const { title, description, duration, allowReplay, isActive, sections } =
        req.body;

      if (!title || !sections) {
        ApiResponse.badRequest(res, "title and sections are required");
        return;
      }

      // Audio is uploaded via multer; file path is in req.file
      const audioFile = (req as any).file;
      if (!audioFile) {
        ApiResponse.badRequest(res, "Audio file is required");
        return;
      }

      if (!audioFile.buffer) {
        ApiResponse.badRequest(
          res,
          "Audio upload payload is invalid. Please re-upload the file.",
        );
        return;
      }

      const uploadResult = await uploadBufferToObjectStorage({
        bucket: env.storageListeningBucket,
        folder: "listening",
        originalName: audioFile.originalname,
        mimeType: audioFile.mimetype,
        content: audioFile.buffer,
      });
      const audioUrl = uploadResult.url;

      const test = await listeningService.adminCreateTest({
        title,
        description,
        audioUrl,
        duration: duration ? parseInt(duration) : undefined,
        allowReplay: allowReplay === "true" || allowReplay === true,
        isActive:
          isActive === undefined
            ? true
            : isActive === "true" || isActive === true,
        sections:
          typeof sections === "string" ? JSON.parse(sections) : sections,
        createdBy: req.user!.id,
      });

      ApiResponse.created(res, test, "Listening test created");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** PUT /api/listening/admin/tests/:id */
  async adminUpdateTest(req: AuthenticatedRequest, res: Response) {
    try {
      const updates = { ...req.body };

      // If new audio uploaded
      const audioFile = (req as any).file;
      if (audioFile) {
        if (!audioFile.buffer) {
          ApiResponse.badRequest(
            res,
            "Audio upload payload is invalid. Please re-upload the file.",
          );
          return;
        }

        const uploadResult = await uploadBufferToObjectStorage({
          bucket: env.storageListeningBucket,
          folder: "listening",
          originalName: audioFile.originalname,
          mimeType: audioFile.mimetype,
          content: audioFile.buffer,
        });
        updates.audioUrl = uploadResult.url;
      }

      if (updates.sections && typeof updates.sections === "string") {
        updates.sections = JSON.parse(updates.sections);
      }
      if (updates.allowReplay !== undefined) {
        updates.allowReplay =
          updates.allowReplay === "true" || updates.allowReplay === true;
      }
      if (updates.isActive !== undefined) {
        updates.isActive =
          updates.isActive === "true" || updates.isActive === true;
      }
      if (updates.duration !== undefined && updates.duration !== "") {
        const d = parseInt(String(updates.duration), 10);
        if (!Number.isNaN(d)) updates.duration = d;
      }

      const updated = await listeningService.adminUpdateTest(
        req.params.id,
        updates,
      );
      ApiResponse.success(res, updated, "Listening test updated");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** DELETE /api/listening/admin/tests/:id */
  async adminDeleteTest(req: AuthenticatedRequest, res: Response) {
    try {
      await listeningService.adminDeleteTest(req.params.id);
      ApiResponse.success(res, null, "Listening test deleted");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/listening/admin/tests/:id/attempts */
  async adminGetAttempts(req: AuthenticatedRequest, res: Response) {
    try {
      const attempts = await listeningService.adminGetAttempts(req.params.id);
      ApiResponse.success(res, attempts);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  // ═══════════════════════════════════════════════
  // STUDENT
  // ═══════════════════════════════════════════════

  /** GET /api/listening/active */
  async listActive(req: AuthenticatedRequest, res: Response) {
    try {
      const tests = await listeningService.listActiveTests();
      ApiResponse.success(res, tests);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/listening/tests/:id */
  async getTest(req: AuthenticatedRequest, res: Response) {
    try {
      const test = await listeningService.getTestForStudent(req.params.id);
      ApiResponse.success(res, test);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** POST /api/listening/start */
  async startAttempt(req: AuthenticatedRequest, res: Response) {
    try {
      const { testId, mode } = req.body;
      if (!testId || !mode) {
        ApiResponse.badRequest(res, "testId and mode are required");
        return;
      }
      if (
        ![ListeningTestMode.PRACTICE, ListeningTestMode.EXAM].includes(mode)
      ) {
        ApiResponse.badRequest(res, "mode must be 'practice' or 'exam'");
        return;
      }
      const data = await listeningService.startAttempt(
        req.user!.id,
        testId,
        mode,
      );
      ApiResponse.success(res, data);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/listening/timer/:testId */
  async getTimer(req: AuthenticatedRequest, res: Response) {
    try {
      const timer = await listeningService.getTimer(
        req.user!.id,
        req.params.testId,
      );
      if (!timer) {
        ApiResponse.notFound(res, "No active timer");
        return;
      }
      ApiResponse.success(res, timer);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/listening/autosave */
  async autosave(req: AuthenticatedRequest, res: Response) {
    try {
      const { testId, answers, attemptId, mode } = req.body;
      if (!testId || answers === undefined || answers === null) {
        ApiResponse.badRequest(res, "testId and answers are required");
        return;
      }
      if (typeof answers !== "object" || Array.isArray(answers)) {
        ApiResponse.badRequest(res, "answers must be a JSON object");
        return;
      }
      await listeningService.autosaveAnswers(
        req.user!.id,
        testId,
        answers,
        {
          attemptId: attemptId ?? undefined,
          mode:
            mode === "practice"
              ? ListeningTestMode.PRACTICE
              : mode === "exam"
                ? ListeningTestMode.EXAM
                : undefined,
        },
      );
      ApiResponse.success(res, null, "Answers autosaved");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/listening/submit */
  async submitAttempt(req: AuthenticatedRequest, res: Response) {
    try {
      const { testId, answers, attemptId, mode } = req.body;
      if (!testId || answers === undefined || answers === null) {
        ApiResponse.badRequest(res, "testId and answers are required");
        return;
      }
      if (typeof answers !== "object" || Array.isArray(answers)) {
        ApiResponse.badRequest(res, "answers must be a JSON object");
        return;
      }
      const result = await listeningService.submitAttempt(
        req.user!.id,
        testId,
        answers,
        {
          attemptId: attemptId ?? undefined,
          mode:
            mode === "practice"
              ? ListeningTestMode.PRACTICE
              : mode === "exam"
                ? ListeningTestMode.EXAM
                : undefined,
        },
      );
      ApiResponse.success(res, result, "Attempt submitted");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/listening/my-attempts */
  async myAttempts(req: AuthenticatedRequest, res: Response) {
    try {
      const attempts = await listeningService.getStudentAttempts(req.user!.id);
      ApiResponse.success(res, attempts);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/listening/attempts/:id */
  async getAttemptDetail(req: AuthenticatedRequest, res: Response) {
    try {
      const attempt = await listeningService.getAttemptDetail(
        req.params.id,
        req.user!.id,
      );
      ApiResponse.success(res, attempt);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }
}

export const listeningController = new ListeningController();
