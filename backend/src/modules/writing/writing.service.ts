import { AppDataSource } from "../../config/database";
import { redis } from "../../config/redis";
import { WritingModule, WritingTaskType } from "../../entities/WritingModule";
import {
  WritingSession,
  WritingSessionMode,
  WritingSessionStatus,
} from "../../entities/WritingSession";
import { ObjectId } from "mongodb";

// Redis key helpers
const timerKey = (id: string) => `writing:timer:${id}`; // stores Unix ms end time
const draftKey = (id: string) => `writing:draft:${id}`; // stores draft essay text
const lockKey = (id: string) => `writing:lock:${id}`; // paused lock

const moduleRepo = () => AppDataSource.getRepository(WritingModule);
const sessionRepo = () => AppDataSource.getRepository(WritingSession);

// ─── Admin: Module CRUD ───────────────────────────────────────────────────────

export async function adminListModules() {
  return moduleRepo().find({ order: { createdAt: "DESC" } as any });
}

export async function adminGetModule(id: string) {
  const mod = await moduleRepo().findOne({
    where: { _id: new ObjectId(id) } as any,
  });
  if (!mod) throw new Error("Module not found");
  return mod;
}

export async function adminCreateModule(data: {
  title: string;
  taskType: WritingTaskType;
  instruction: string;
  imageUrl?: string;
  duration?: number;
  createdBy: string;
}) {
  const mod = moduleRepo().create({
    title: data.title,
    taskType: data.taskType,
    instruction: data.instruction,
    imageUrl: data.imageUrl,
    duration: data.duration ?? 40,
    isActive: true,
    createdBy: data.createdBy,
  });
  return moduleRepo().save(mod);
}

export async function adminUpdateModule(
  id: string,
  data: Partial<{
    title: string;
    taskType: WritingTaskType;
    instruction: string;
    imageUrl: string;
    duration: number;
    isActive: boolean;
  }>,
) {
  const mod = await adminGetModule(id);
  Object.assign(mod, data);
  return moduleRepo().save(mod);
}

export async function adminDeleteModule(id: string) {
  await moduleRepo().delete(new ObjectId(id) as any);
}

export async function adminGetSubmissions(moduleId: string) {
  return sessionRepo().find({
    where: { moduleId } as any,
    order: { createdAt: "DESC" } as any,
  });
}

export async function adminGetSubmission(sessionId: string) {
  const session = await sessionRepo().findOne({
    where: { _id: new ObjectId(sessionId) } as any,
  });
  if (!session) throw new Error("Session not found");
  return session;
}

export async function adminScoreSession(
  sessionId: string,
  score: number,
  feedback: string,
) {
  const session = await adminGetSubmission(sessionId);
  session.score = score;
  session.feedback = feedback;
  return sessionRepo().save(session);
}

// ─── Student: list active modules ────────────────────────────────────────────

export async function listActiveModules(taskType?: WritingTaskType) {
  const where: any = { isActive: true };
  if (taskType) where.taskType = taskType;
  return moduleRepo().find({ where, order: { createdAt: "DESC" } as any });
}

export async function getModuleForStudent(id: string) {
  const mod = await moduleRepo().findOne({
    where: { _id: new ObjectId(id), isActive: true } as any,
  });
  if (!mod) throw new Error("Module not found or inactive");
  return mod;
}

// ─── Exam session management ─────────────────────────────────────────────────

export async function startSession(
  userId: string,
  moduleId: string,
  mode: WritingSessionMode,
) {
  const mod = await getModuleForStudent(moduleId);

  // Exam mode: only one active session per module per user
  if (mode === WritingSessionMode.EXAM) {
    const existing = await sessionRepo().findOne({
      where: {
        userId,
        moduleId,
        mode: WritingSessionMode.EXAM,
        status: WritingSessionStatus.SUBMITTED,
      } as any,
    });
    if (existing) throw new Error("You have already submitted this exam");
  }

  // Check for an existing ACTIVE session (resume it)
  const active = await sessionRepo().findOne({
    where: {
      userId,
      moduleId,
      status: WritingSessionStatus.ACTIVE,
    } as any,
  });
  if (active) {
    // Re-set Redis timer if missing
    const endMs = await redis.get(timerKey(active._id.toString()));
    if (!endMs) {
      const endTime = Date.now() + mod.duration * 60 * 1000;
      await redis.set(
        timerKey(active._id.toString()),
        endTime.toString(),
        "EX",
        mod.duration * 60 + 60,
      );
    }
    return active;
  }

  const session = sessionRepo().create({
    userId,
    moduleId,
    mode,
    status: WritingSessionStatus.ACTIVE,
    essayText: "",
    wordCount: 0,
    startTime: new Date(),
  });
  const saved = await sessionRepo().save(session);

  // Store end time in Redis
  const endMs = Date.now() + mod.duration * 60 * 1000;
  await redis.set(
    timerKey(saved._id.toString()),
    endMs.toString(),
    "EX",
    mod.duration * 60 + 60,
  );

  return saved;
}

export async function getTimerRemaining(sessionId: string): Promise<number> {
  const endMs = await redis.get(timerKey(sessionId));
  if (!endMs) return 0;
  const remaining = Math.max(
    0,
    Math.floor((parseInt(endMs) - Date.now()) / 1000),
  );
  return remaining;
}

export async function autoSave(
  sessionId: string,
  userId: string,
  essayText: string,
) {
  // Validate ownership
  const session = await sessionRepo().findOne({
    where: { _id: new ObjectId(sessionId) } as any,
  });
  if (!session || session.userId !== userId)
    throw new Error("Session not found");
  if (
    session.status === WritingSessionStatus.SUBMITTED ||
    session.status === WritingSessionStatus.AUTO_SUBMITTED
  ) {
    throw new Error("Session already submitted");
  }

  const wordCount = countWords(essayText);

  // Save to Redis draft (fast path)
  await redis.set(
    draftKey(sessionId),
    JSON.stringify({ essayText, wordCount }),
    "EX",
    24 * 60 * 60,
  );

  return { wordCount };
}

export async function getDraft(sessionId: string, userId: string) {
  const session = await sessionRepo().findOne({
    where: { _id: new ObjectId(sessionId) } as any,
  });
  if (!session || session.userId !== userId)
    throw new Error("Session not found");

  const raw = await redis.get(draftKey(sessionId));
  if (raw) return JSON.parse(raw) as { essayText: string; wordCount: number };
  return { essayText: session.essayText ?? "", wordCount: session.wordCount };
}

export async function pauseSession(sessionId: string, userId: string) {
  const session = await sessionRepo().findOne({
    where: { _id: new ObjectId(sessionId) } as any,
  });
  if (!session || session.userId !== userId)
    throw new Error("Session not found");
  if (session.status !== WritingSessionStatus.ACTIVE)
    throw new Error("Session is not active");

  const remaining = await getTimerRemaining(sessionId);
  session.status = WritingSessionStatus.PAUSED;
  session.remainingTime = remaining;

  // Persist draft from Redis → DB
  const raw = await redis.get(draftKey(sessionId));
  if (raw) {
    const draft = JSON.parse(raw);
    session.essayText = draft.essayText;
    session.wordCount = draft.wordCount;
  }

  await sessionRepo().save(session);

  // Clear Redis timer and set lock
  await redis.del(timerKey(sessionId));
  await redis.set(lockKey(sessionId), "1", "EX", 24 * 60 * 60);

  return session;
}

export async function resumeSession(sessionId: string, userId: string) {
  const session = await sessionRepo().findOne({
    where: { _id: new ObjectId(sessionId) } as any,
  });
  if (!session || session.userId !== userId)
    throw new Error("Session not found");
  if (session.status !== WritingSessionStatus.PAUSED)
    throw new Error("Session is not paused");

  const remaining = session.remainingTime ?? 0;
  if (remaining <= 0) {
    return autoSubmit(sessionId);
  }

  session.status = WritingSessionStatus.ACTIVE;
  session.remainingTime = undefined;
  await sessionRepo().save(session);

  // Re-set Redis timer
  const endMs = Date.now() + remaining * 1000;
  await redis.set(timerKey(sessionId), endMs.toString(), "EX", remaining + 60);
  await redis.del(lockKey(sessionId));

  return session;
}

export async function submitSession(
  sessionId: string,
  userId: string,
  essayText: string,
) {
  const session = await sessionRepo().findOne({
    where: { _id: new ObjectId(sessionId) } as any,
  });
  if (!session || session.userId !== userId)
    throw new Error("Session not found");
  if (
    session.status === WritingSessionStatus.SUBMITTED ||
    session.status === WritingSessionStatus.AUTO_SUBMITTED
  ) {
    return session; // idempotent
  }

  const wordCount = countWords(essayText);
  session.essayText = essayText;
  session.wordCount = wordCount;
  session.status = WritingSessionStatus.SUBMITTED;
  session.endTime = new Date();

  await sessionRepo().save(session);

  // Cleanup Redis
  await redis.del(timerKey(sessionId));
  await redis.del(draftKey(sessionId));
  await redis.del(lockKey(sessionId));

  return session;
}

export async function autoSubmit(sessionId: string) {
  const session = await sessionRepo().findOne({
    where: { _id: new ObjectId(sessionId) } as any,
  });
  if (!session) throw new Error("Session not found");
  if (
    session.status === WritingSessionStatus.SUBMITTED ||
    session.status === WritingSessionStatus.AUTO_SUBMITTED
  ) {
    return session;
  }

  // Read last draft from Redis or keep existing
  const raw = await redis.get(draftKey(sessionId));
  if (raw) {
    const draft = JSON.parse(raw);
    session.essayText = draft.essayText;
    session.wordCount = draft.wordCount;
  }

  session.status = WritingSessionStatus.AUTO_SUBMITTED;
  session.endTime = new Date();
  await sessionRepo().save(session);

  await redis.del(timerKey(sessionId));
  await redis.del(draftKey(sessionId));
  await redis.del(lockKey(sessionId));

  return session;
}

export async function getSession(sessionId: string, userId: string) {
  const session = await sessionRepo().findOne({
    where: { _id: new ObjectId(sessionId) } as any,
  });
  if (!session || session.userId !== userId)
    throw new Error("Session not found");
  return session;
}

export async function getMyHistory(userId: string) {
  return sessionRepo().find({
    where: { userId } as any,
    order: { createdAt: "DESC" } as any,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}
