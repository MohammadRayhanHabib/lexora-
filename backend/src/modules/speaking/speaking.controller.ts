import { Response } from "express";
import * as speakingService from "./speaking.service";
import { ApiResponse } from "../../utils/response";
import { AuthenticatedRequest } from "../../types";
import { SpeakingTestMode } from "../../entities/SpeakingSession";
import { UserRole } from "../../types";

export class SpeakingController {
  // ═══════════════════════════════════════════════
  // ADMIN — Tests
  // ═══════════════════════════════════════════════

  /** GET /api/speaking/admin/tests */
  async adminListTests(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await speakingService.adminListTests(page, limit);
      ApiResponse.success(res, data);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/speaking/admin/tests/:id */
  async adminGetTest(req: AuthenticatedRequest, res: Response) {
    try {
      const test = await speakingService.adminGetTest(req.params.id);
      ApiResponse.success(res, test);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** POST /api/speaking/admin/tests */
  async adminCreateTest(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        title,
        description,
        part1Questions,
        cueCardTopic,
        cueCardInstructions,
        prepTime,
        speakingTime,
        part3Questions,
        totalDuration,
        perQuestionRecording,
      } = req.body;

      if (!title || !cueCardTopic) {
        ApiResponse.badRequest(res, "title and cueCardTopic are required");
        return;
      }

      const parseArray = (val: any): string[] => {
        if (Array.isArray(val)) return val;
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val.split("\n").filter(Boolean);
          }
        }
        return [];
      };

      const test = await speakingService.adminCreateTest({
        title,
        description,
        part1Questions: parseArray(part1Questions),
        cueCardTopic,
        cueCardInstructions,
        prepTime: prepTime ? parseInt(prepTime) : undefined,
        speakingTime: speakingTime ? parseInt(speakingTime) : undefined,
        part3Questions: parseArray(part3Questions),
        totalDuration: totalDuration ? parseInt(totalDuration) : undefined,
        perQuestionRecording:
          perQuestionRecording === "true" || perQuestionRecording === true,
        createdBy: req.user!.id,
      });

      ApiResponse.created(res, test, "Speaking test created");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** PUT /api/speaking/admin/tests/:id */
  async adminUpdateTest(req: AuthenticatedRequest, res: Response) {
    try {
      const updates = { ...req.body };
      const parseArray = (val: any): string[] | undefined => {
        if (!val) return undefined;
        if (Array.isArray(val)) return val;
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val.split("\n").filter(Boolean);
          }
        }
        return undefined;
      };
      if (updates.part1Questions)
        updates.part1Questions = parseArray(updates.part1Questions);
      if (updates.part3Questions)
        updates.part3Questions = parseArray(updates.part3Questions);
      if (updates.prepTime) updates.prepTime = parseInt(updates.prepTime);
      if (updates.speakingTime)
        updates.speakingTime = parseInt(updates.speakingTime);
      if (updates.totalDuration)
        updates.totalDuration = parseInt(updates.totalDuration);
      if (updates.perQuestionRecording !== undefined)
        updates.perQuestionRecording =
          updates.perQuestionRecording === "true" ||
          updates.perQuestionRecording === true;

      const updated = await speakingService.adminUpdateTest(
        req.params.id,
        updates,
      );
      ApiResponse.success(res, updated, "Speaking test updated");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** DELETE /api/speaking/admin/tests/:id */
  async adminDeleteTest(req: AuthenticatedRequest, res: Response) {
    try {
      await speakingService.adminDeleteTest(req.params.id);
      ApiResponse.success(res, null, "Speaking test deleted");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/speaking/admin/sessions */
  async adminListSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const sessions = await speakingService.adminListSessions(
        req.query.testId as string,
      );
      ApiResponse.success(res, sessions);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/speaking/admin/sessions/:id */
  async adminGetSession(req: AuthenticatedRequest, res: Response) {
    try {
      const session = await speakingService.adminGetSession(req.params.id);
      ApiResponse.success(res, session);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** POST /api/speaking/admin/sessions/:id/score */
  async adminScoreSession(req: AuthenticatedRequest, res: Response) {
    try {
      const { score, feedback, partScores } = req.body;
      if (score === undefined) {
        ApiResponse.badRequest(res, "score is required");
        return;
      }
      const session = await speakingService.adminScoreSession(
        req.params.id,
        parseFloat(score),
        feedback ?? "",
        typeof partScores === "string"
          ? JSON.parse(partScores)
          : (partScores ?? {}),
        req.user!.id,
      );
      ApiResponse.success(res, session, "Session scored");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  // ═══════════════════════════════════════════════
  // STUDENT
  // ═══════════════════════════════════════════════

  /** GET /api/speaking/active */
  async listActive(req: AuthenticatedRequest, res: Response) {
    try {
      const tests = await speakingService.listActiveTests();
      ApiResponse.success(res, tests);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/speaking/tests/:id */
  async getTest(req: AuthenticatedRequest, res: Response) {
    try {
      const test = await speakingService.getTestForStudent(req.params.id);
      ApiResponse.success(res, test);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** POST /api/speaking/start */
  async startSession(req: AuthenticatedRequest, res: Response) {
    try {
      const { testId, mode } = req.body;
      if (!testId || !mode) {
        ApiResponse.badRequest(res, "testId and mode are required");
        return;
      }
      if (![SpeakingTestMode.PRACTICE, SpeakingTestMode.EXAM].includes(mode)) {
        ApiResponse.badRequest(res, "mode must be 'practice' or 'exam'");
        return;
      }
      const data = await speakingService.startSession(
        req.user!.id,
        testId,
        mode,
      );
      ApiResponse.success(res, data);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/speaking/timer/:testId */
  async getTimer(req: AuthenticatedRequest, res: Response) {
    try {
      const timer = await speakingService.getTimer(
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

  /** POST /api/speaking/part-timer */
  async setPartTimer(req: AuthenticatedRequest, res: Response) {
    try {
      const { testId, part, durationSeconds } = req.body;
      if (!testId || !part || !durationSeconds) {
        ApiResponse.badRequest(
          res,
          "testId, part, durationSeconds are required",
        );
        return;
      }
      const timer = await speakingService.setPartTimer(
        req.user!.id,
        testId,
        parseInt(part),
        parseInt(durationSeconds),
      );
      ApiResponse.success(res, timer);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/speaking/part-timer/:testId/:part */
  async getPartTimer(req: AuthenticatedRequest, res: Response) {
    try {
      const timer = await speakingService.getPartTimer(
        req.user!.id,
        req.params.testId,
        parseInt(req.params.part),
      );
      ApiResponse.success(res, timer);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/speaking/upload-audio */
  async uploadAudio(req: AuthenticatedRequest, res: Response) {
    try {
      const { testId, part, questionIndex, durationSeconds } = req.body;
      const audioFile = (req as any).file;

      if (!audioFile) {
        ApiResponse.badRequest(res, "Audio file is required");
        return;
      }
      if (!testId || !part) {
        ApiResponse.badRequest(res, "testId and part are required");
        return;
      }

      const audioUrl = `/uploads/speaking/${audioFile.filename}`;
      const session = await speakingService.saveRecording(
        req.user!.id,
        testId,
        {
          part: parseInt(part) as 1 | 2 | 3,
          questionIndex: questionIndex ? parseInt(questionIndex) : undefined,
          audioUrl,
          durationSeconds: durationSeconds
            ? parseInt(durationSeconds)
            : undefined,
        },
      );

      ApiResponse.success(res, { audioUrl, session }, "Recording saved");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/speaking/submit */
  async submitSession(req: AuthenticatedRequest, res: Response) {
    try {
      const { testId } = req.body;
      if (!testId) {
        ApiResponse.badRequest(res, "testId is required");
        return;
      }
      const result = await speakingService.submitSession(req.user!.id, testId);
      ApiResponse.success(res, result, "Speaking session submitted");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/speaking/my-sessions */
  async mySessions(req: AuthenticatedRequest, res: Response) {
    try {
      const sessions = await speakingService.getStudentSessions(req.user!.id);
      ApiResponse.success(res, sessions);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/speaking/sessions/:id */
  async getSessionDetail(req: AuthenticatedRequest, res: Response) {
    try {
      const session = await speakingService.getSessionDetail(
        req.params.id,
        req.user!.id,
      );
      ApiResponse.success(res, session);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }
}

export const speakingController = new SpeakingController();
