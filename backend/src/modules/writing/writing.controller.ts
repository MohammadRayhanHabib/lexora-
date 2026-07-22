import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../types";
import * as svc from "./writing.service";
import { ApiResponse } from "../../utils/response";
import { WritingTaskType } from "../../entities/WritingModule";
import { WritingSessionMode } from "../../entities/WritingSession";
import { uploadBufferToObjectStorage } from "../../utils/objectStorage";
import { env } from "../../config/env";

type Req = AuthenticatedRequest;

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function adminListModules(req: Req, res: Response) {
  try {
    const modules = await svc.adminListModules();
    ApiResponse.success(res, modules);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function adminGetModule(req: Req, res: Response) {
  try {
    const mod = await svc.adminGetModule(req.params.id);
    ApiResponse.success(res, mod);
  } catch (err: any) {
    ApiResponse.notFound(res, err.message);
  }
}

export async function adminCreateModule(req: Req, res: Response) {
  try {
    const imageFile = req.file as Express.Multer.File | undefined;
    const { title, taskType, instruction, duration } = req.body;
    if (!title || !taskType || !instruction) {
      return ApiResponse.badRequest(
        res,
        "title, taskType, and instruction are required",
      );
    }
    if (!Object.values(WritingTaskType).includes(taskType)) {
      return ApiResponse.badRequest(
        res,
        "Invalid taskType. Use 'task1' or 'task2'",
      );
    }
    let imageUrl: string | undefined;
    if (imageFile) {
      const uploaded = await uploadBufferToObjectStorage({
        bucket: env.storagePicturesBucket,
        folder: "writing/modules",
        originalName: imageFile.originalname,
        mimeType: imageFile.mimetype,
        content: imageFile.buffer,
      });
      imageUrl = uploaded.url;
    }

    const mod = await svc.adminCreateModule({
      title,
      taskType,
      instruction,
      imageUrl,
      duration: duration ? parseInt(duration) : 40,
      createdBy: req.user!.id,
    });
    ApiResponse.created(res, mod);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function adminUpdateModule(req: Req, res: Response) {
  try {
    const imageFile = req.file as Express.Multer.File | undefined;
    const { title, taskType, instruction, duration, isActive } = req.body;
    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title;
    if (taskType !== undefined) {
      if (!Object.values(WritingTaskType).includes(taskType)) {
        return ApiResponse.badRequest(res, "Invalid taskType");
      }
      updates.taskType = taskType;
    }
    if (instruction !== undefined) updates.instruction = instruction;
    if (duration !== undefined) updates.duration = parseInt(duration);
    if (isActive !== undefined)
      updates.isActive = isActive === "true" || isActive === true;
    if (imageFile) {
      const uploaded = await uploadBufferToObjectStorage({
        bucket: env.storagePicturesBucket,
        folder: "writing/modules",
        originalName: imageFile.originalname,
        mimeType: imageFile.mimetype,
        content: imageFile.buffer,
      });
      updates.imageUrl = uploaded.url;
    }

    const mod = await svc.adminUpdateModule(req.params.id, updates);
    ApiResponse.success(res, mod);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function adminDeleteModule(req: Req, res: Response) {
  try {
    await svc.adminDeleteModule(req.params.id);
    ApiResponse.success(res, { message: "Module deleted" });
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function adminGetSubmissions(req: Req, res: Response) {
  try {
    const sessions = await svc.adminGetSubmissions(req.params.moduleId);
    ApiResponse.success(res, sessions);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function adminGetSubmission(req: Req, res: Response) {
  try {
    const session = await svc.adminGetSubmission(req.params.sessionId);
    ApiResponse.success(res, session);
  } catch (err: any) {
    ApiResponse.notFound(res, err.message);
  }
}

export async function adminScoreSession(req: Req, res: Response) {
  try {
    const { score, feedback } = req.body;
    if (score === undefined || feedback === undefined) {
      return ApiResponse.badRequest(res, "score and feedback are required");
    }
    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 9) {
      return ApiResponse.badRequest(res, "score must be between 0 and 9");
    }
    const session = await svc.adminScoreSession(
      req.params.sessionId,
      numScore,
      feedback,
    );
    ApiResponse.success(res, session);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

// ─── Student ─────────────────────────────────────────────────────────────────────────

export async function listActiveModules(req: Req, res: Response) {
  try {
    const { taskType } = req.query;
    const modules = await svc.listActiveModules(
      taskType as WritingTaskType | undefined,
    );
    ApiResponse.success(res, modules);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function getModule(req: Req, res: Response) {
  try {
    const mod = await svc.getModuleForStudent(req.params.id);
    ApiResponse.success(res, mod);
  } catch (err: any) {
    ApiResponse.notFound(res, err.message);
  }
}

export async function startSession(req: Req, res: Response) {
  try {
    const { moduleId, mode } = req.body;
    if (!moduleId || !mode) {
      return ApiResponse.badRequest(res, "moduleId and mode are required");
    }
    if (!Object.values(WritingSessionMode).includes(mode)) {
      return ApiResponse.badRequest(
        res,
        "Invalid mode. Use 'practice' or 'exam'",
      );
    }
    const session = await svc.startSession(req.user!.id, moduleId, mode);
    ApiResponse.created(res, session);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function getTimer(req: Req, res: Response) {
  try {
    const remaining = await svc.getTimerRemaining(req.params.sessionId);
    if (remaining <= 0) {
      await svc.autoSubmit(req.params.sessionId);
    }
    ApiResponse.success(res, { remainingSeconds: remaining });
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function autoSave(req: Req, res: Response) {
  try {
    const { essayText } = req.body;
    const result = await svc.autoSave(
      req.params.sessionId,
      req.user!.id,
      essayText ?? "",
    );
    ApiResponse.success(res, result);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function getDraft(req: Req, res: Response) {
  try {
    const draft = await svc.getDraft(req.params.sessionId, req.user!.id);
    ApiResponse.success(res, draft);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function pauseSession(req: Req, res: Response) {
  try {
    const session = await svc.pauseSession(req.params.sessionId, req.user!.id);
    ApiResponse.success(res, session);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function resumeSession(req: Req, res: Response) {
  try {
    const session = await svc.resumeSession(req.params.sessionId, req.user!.id);
    ApiResponse.success(res, session);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function submitSession(req: Req, res: Response) {
  try {
    const { essayText } = req.body;
    const session = await svc.submitSession(
      req.params.sessionId,
      req.user!.id,
      essayText ?? "",
    );
    ApiResponse.success(res, session);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function getSession(req: Req, res: Response) {
  try {
    const session = await svc.getSession(req.params.sessionId, req.user!.id);
    ApiResponse.success(res, session);
  } catch (err: any) {
    ApiResponse.notFound(res, err.message);
  }
}

export async function getMyHistory(req: Req, res: Response) {
  try {
    const history = await svc.getMyHistory(req.user!.id);
    ApiResponse.success(res, history);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}
