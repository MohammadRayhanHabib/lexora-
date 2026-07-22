import { Response } from "express";
import { testEngineService } from "./testEngine.service";
import { ApiResponse } from "../../utils/response";
import {
  validate,
  startPracticeSchema,
  startMockSchema,
  submitAnswersSchema,
} from "../../utils/validators";
import { AuthenticatedRequest, TestModule, TestType } from "../../types";

export class TestEngineController {
  // ─── PRACTICE ───────────────────────────────────────────

  /** GET /api/tests/practice?module=listening */
  async listPracticeTests(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const module = req.query.module as TestModule | undefined;
      const tests = await testEngineService.listPracticeTests(module);
      ApiResponse.success(res, tests);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/tests/practice/:id */
  async getPracticeTest(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const test = await testEngineService.getPracticeTest(req.params.id);
      ApiResponse.success(res, test);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** POST /api/tests/practice/start */
  async startPracticeTest(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { error, value } = validate(startPracticeSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }

      const attempt = await testEngineService.startPracticeTest(
        req.user!.id,
        value.testId,
        value.module,
        req.ip,
      );
      ApiResponse.created(res, attempt, "Practice test started");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** POST /api/tests/practice/submit */
  async submitPracticeTest(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { error, value } = validate(submitAnswersSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }

      const result = await testEngineService.submitPracticeTest(
        req.user!.id,
        value.attemptId,
        value.answers,
        value.timeTaken,
      );
      ApiResponse.success(res, result, "Practice test submitted");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** GET /api/tests/practice/:testId/recent */
  async getRecentPracticeAttempts(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const attempts = await testEngineService.getRecentPracticeAttempts(
        req.user!.id,
        req.params.testId,
      );
      ApiResponse.success(res, attempts);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  // ─── MOCK ───────────────────────────────────────────────

  /** GET /api/tests/mock */
  async listMockTests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tests = await testEngineService.listMockTests();
      ApiResponse.success(res, tests);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/tests/mock/:id */
  async getMockTest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const test = await testEngineService.getMockTest(req.params.id);
      ApiResponse.success(res, test);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** POST /api/tests/mock/start */
  async startMockTest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = validate(startMockSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }

      const attempt = await testEngineService.startMockTest(
        req.user!.id,
        value.testId,
        req.ip,
        req.headers["user-agent"],
      );
      ApiResponse.created(res, attempt, "Mock test started");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** POST /api/tests/mock/submit */
  async submitMockTest(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { error, value } = validate(submitAnswersSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }

      const result = await testEngineService.submitMockTest(
        req.user!.id,
        value.attemptId,
        value.answers,
        value.timeTaken,
      );
      ApiResponse.success(res, result, "Mock test submitted");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  // ─── COMMON ─────────────────────────────────────────────

  /** GET /api/tests/attempts/:id */
  async getAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const attempt = await testEngineService.getAttempt(
        req.params.id,
        req.user!.id,
      );
      ApiResponse.success(res, attempt);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** GET /api/tests/attempts?type=practice&page=1&limit=20 */
  async getUserAttempts(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const testType = req.query.type as TestType | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { attempts, total } = await testEngineService.getUserAttempts(
        req.user!.id,
        testType,
        page,
        limit,
      );
      ApiResponse.paginated(res, attempts, total, page, limit);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }
}

export const testEngineController = new TestEngineController();
