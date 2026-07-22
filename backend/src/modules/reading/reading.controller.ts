import { Response } from "express";
import { readingService } from "./reading.service";
import { ApiResponse } from "../../utils/response";
import { AuthenticatedRequest, UserRole } from "../../types";
import { isReadingQuestionType } from "../../entities/ReadingQuestion";
import { uploadBufferToObjectStorage } from "../../utils/objectStorage";
import { env } from "../../config/env";

export class ReadingController {
  // ═══════════════════════════════════════════════
  // ADMIN — Tests
  // ═══════════════════════════════════════════════

  /** GET /api/reading/admin/tests */
  async adminListTests(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await readingService.adminListTests(page, limit);
      ApiResponse.success(res, data);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/reading/admin/tests/:id */
  async adminGetTest(req: AuthenticatedRequest, res: Response) {
    try {
      const test = await readingService.adminGetTest(req.params.id);
      const questions = await readingService.adminGetQuestions(req.params.id);
      ApiResponse.success(res, { test, questions });
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** POST /api/reading/admin/tests */
  async adminCreateTest(req: AuthenticatedRequest, res: Response) {
    try {
      const imageFile = (req as any).file as Express.Multer.File | undefined;
      const {
        title,
        passageTitle,
        passageContent,
        passageImage,
        duration,
        showExplanations,
        academicNumber,
        testNumber,
        partNumber,
        partTypeLabel,
      } = req.body;
      if (!title || !passageTitle || !passageContent) {
        ApiResponse.badRequest(
          res,
          "title, passageTitle and passageContent are required",
        );
        return;
      }

      let resolvedPassageImage = passageImage;
      if (imageFile) {
        const uploaded = await uploadBufferToObjectStorage({
          bucket: env.storagePicturesBucket,
          folder: "reading/passages",
          originalName: imageFile.originalname,
          mimeType: imageFile.mimetype,
          content: imageFile.buffer,
        });
        resolvedPassageImage = uploaded.url;
      }

      const test = await readingService.adminCreateTest(
        {
          title,
          passageTitle,
          passageContent,
          passageImage: resolvedPassageImage,
          duration,
          showExplanations,
          academicNumber: academicNumber ? Number(academicNumber) : undefined,
          testNumber: testNumber ? Number(testNumber) : undefined,
          partNumber: partNumber ? Number(partNumber) : undefined,
          partTypeLabel,
        },
        req.user!.id,
      );
      ApiResponse.created(res, test, "Reading test created");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** PUT /api/reading/admin/tests/:id */
  async adminUpdateTest(req: AuthenticatedRequest, res: Response) {
    try {
      const imageFile = (req as any).file as Express.Multer.File | undefined;
      const updates = { ...req.body };

      if (imageFile) {
        const uploaded = await uploadBufferToObjectStorage({
          bucket: env.storagePicturesBucket,
          folder: "reading/passages",
          originalName: imageFile.originalname,
          mimeType: imageFile.mimetype,
          content: imageFile.buffer,
        });
        updates.passageImage = uploaded.url;
      }

      const updated = await readingService.adminUpdateTest(
        req.params.id,
        updates,
      );
      ApiResponse.success(res, updated, "Reading test updated");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** DELETE /api/reading/admin/tests/:id */
  async adminDeleteTest(req: AuthenticatedRequest, res: Response) {
    try {
      await readingService.adminDeleteTest(req.params.id);
      ApiResponse.success(res, null, "Reading test deleted");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  // ═══════════════════════════════════════════════
  // ADMIN — Questions
  // ═══════════════════════════════════════════════

  /** GET /api/reading/admin/tests/:testId/questions */
  async adminGetQuestions(req: AuthenticatedRequest, res: Response) {
    try {
      const questions = await readingService.adminGetQuestions(
        req.params.testId,
      );
      ApiResponse.success(res, questions);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/reading/admin/tests/:testId/questions */
  async adminCreateQuestion(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        questionType: rawQuestionType,
        instructions,
        questionText,
        options,
        wordBank,
        correctAnswer,
        orderNumber,
        groupLabel,
        marks,
        explanation,
        pageNumber,
      } = req.body;

      const questionType =
        typeof rawQuestionType === "string" ? rawQuestionType.trim() : "";

      if (!questionText || !correctAnswer || !questionType) {
        ApiResponse.badRequest(
          res,
          "questionType, questionText and correctAnswer are required",
        );
        return;
      }
      if (!isReadingQuestionType(questionType)) {
        ApiResponse.badRequest(res, `Invalid questionType: ${rawQuestionType}`);
        return;
      }

      const q = await readingService.adminCreateQuestion(req.params.testId, {
        questionType,
        instructions,
        questionText,
        options,
        wordBank,
        correctAnswer,
        orderNumber: orderNumber ?? 1,
        groupLabel,
        marks,
        explanation,
        pageNumber: (() => {
          if (
            pageNumber === undefined ||
            pageNumber === null ||
            pageNumber === ""
          ) {
            return undefined;
          }
          const n = Number(pageNumber);
          return Number.isFinite(n) ? n : undefined;
        })(),
      });
      ApiResponse.created(res, q, "Question created");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** PUT /api/reading/admin/questions/:id */
  async adminUpdateQuestion(req: AuthenticatedRequest, res: Response) {
    try {
      if (
        req.body?.questionType !== undefined &&
        !isReadingQuestionType(
          typeof req.body.questionType === "string"
            ? req.body.questionType.trim()
            : req.body.questionType,
        )
      ) {
        ApiResponse.badRequest(
          res,
          `Invalid questionType: ${req.body.questionType}`,
        );
        return;
      }
      const updated = await readingService.adminUpdateQuestion(
        req.params.id,
        req.body,
      );
      ApiResponse.success(res, updated, "Question updated");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** DELETE /api/reading/admin/questions/:id */
  async adminDeleteQuestion(req: AuthenticatedRequest, res: Response) {
    try {
      await readingService.adminDeleteQuestion(req.params.id);
      ApiResponse.success(res, null, "Question deleted");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/reading/admin/tests/:testId/questions/reorder */
  async adminReorderQuestions(req: AuthenticatedRequest, res: Response) {
    try {
      const { order } = req.body; // [{ id, orderNumber }]
      if (!Array.isArray(order)) {
        ApiResponse.badRequest(res, "order must be an array");
        return;
      }
      await readingService.adminReorderQuestions(req.params.testId, order);
      ApiResponse.success(res, null, "Questions reordered");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/reading/admin/tests/:testId/attempts */
  async adminGetAttempts(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await readingService.adminGetAttempts(
        req.params.testId,
        page,
        limit,
      );
      ApiResponse.success(res, data);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  // ═══════════════════════════════════════════════
  // STUDENT — Tests
  // ═══════════════════════════════════════════════

  /** GET /api/reading/tests */
  async listTests(req: AuthenticatedRequest, res: Response) {
    try {
      const tests = await readingService.listActiveTests();
      ApiResponse.success(res, tests);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/reading/tests/grouped */
  async listGroupedTests(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await readingService.listActiveTestsGrouped();
      ApiResponse.success(res, data);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/reading/tests/:id */
  async getTest(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await readingService.getTestForStudent(req.params.id);
      ApiResponse.success(res, data);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  // ═══════════════════════════════════════════════
  // STUDENT — Attempts
  // ═══════════════════════════════════════════════

  /** POST /api/reading/tests/:testId/start */
  async startAttempt(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await readingService.startAttempt(
        req.user!.id,
        req.params.testId,
      );
      ApiResponse.created(res, result, "Reading test started");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** GET /api/reading/attempts/:id/timer */
  async getTimer(req: AuthenticatedRequest, res: Response) {
    try {
      const seconds = await readingService.getTimeRemaining(req.params.id);
      ApiResponse.success(res, { secondsRemaining: seconds });
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/reading/attempts/:id/autosave */
  async autoSave(req: AuthenticatedRequest, res: Response) {
    try {
      const { answers } = req.body;
      if (!Array.isArray(answers)) {
        ApiResponse.badRequest(res, "answers must be an array");
        return;
      }
      await readingService.autoSaveAnswers(
        req.params.id,
        req.user!.id,
        answers,
      );
      res.status(204).send();
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/reading/attempts/:id/draft */
  async getDraft(req: AuthenticatedRequest, res: Response) {
    try {
      const draft = await readingService.getDraftAnswers(req.params.id);
      ApiResponse.success(res, { answers: draft });
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/reading/attempts/:id/submit */
  async submitAttempt(req: AuthenticatedRequest, res: Response) {
    try {
      const { answers } = req.body;
      if (!Array.isArray(answers)) {
        ApiResponse.badRequest(res, "answers must be an array");
        return;
      }
      const result = await readingService.submitAttempt(
        req.params.id,
        req.user!.id,
        answers,
      );
      ApiResponse.success(res, result, "Test submitted successfully");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/reading/attempts/:id */
  async getAttempt(req: AuthenticatedRequest, res: Response) {
    try {
      const attempt = await readingService.getAttempt(
        req.params.id,
        req.user!.id,
      );
      ApiResponse.success(res, attempt);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** GET /api/reading/my-attempts */
  async myAttempts(req: AuthenticatedRequest, res: Response) {
    try {
      const testId = req.query.testId as string | undefined;
      const attempts = await readingService.getUserAttempts(
        req.user!.id,
        testId,
      );
      ApiResponse.success(res, attempts);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }
}

export const readingController = new ReadingController();
