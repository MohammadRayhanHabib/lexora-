import { AppDataSource } from "../../config/database";
import { redis } from "../../config/redis";
import { SpeakingTest } from "../../entities/SpeakingTest";
import {
  SpeakingSession,
  SpeakingSessionStatus,
  SpeakingTestMode,
  SpeakingRecording,
} from "../../entities/SpeakingSession";
import { ObjectId } from "mongodb";

// ─── Redis key helpers ────────────────────────────────────────────────────────
const timerKey = (userId: string, testId: string) =>
  `speaking:timer:${userId}:${testId}`;
const partTimerKey = (userId: string, testId: string, part: number) =>
  `speaking:part:${userId}:${testId}:${part}`;

const testRepo = () => AppDataSource.getRepository(SpeakingTest);
const sessionRepo = () => AppDataSource.getRepository(SpeakingSession);

// ─── Admin: Speaking Test CRUD ────────────────────────────────────────────────

export async function adminListTests(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await testRepo().findAndCount({
    order: { createdAt: "DESC" } as any,
    skip,
    take: limit,
  });
  return { tests: items, total, page, limit };
}

export async function adminGetTest(id: string) {
  const test = await testRepo().findOne({
    where: { _id: new ObjectId(id) } as any,
  });
  if (!test) throw new Error("Speaking test not found");
  return test;
}

export async function adminCreateTest(data: {
  title: string;
  description?: string;
  part1Questions: string[];
  cueCardTopic: string;
  cueCardInstructions?: string;
  prepTime?: number;
  speakingTime?: number;
  part3Questions: string[];
  totalDuration?: number;
  perQuestionRecording?: boolean;
  createdBy: string;
}) {
  const test = testRepo().create({
    title: data.title,
    description: data.description,
    part1Questions: data.part1Questions,
    cueCardTopic: data.cueCardTopic,
    cueCardInstructions: data.cueCardInstructions,
    prepTime: data.prepTime ?? 60,
    speakingTime: data.speakingTime ?? 120,
    part3Questions: data.part3Questions,
    totalDuration: data.totalDuration ?? 15,
    perQuestionRecording: data.perQuestionRecording ?? true,
    isActive: true,
    createdBy: data.createdBy,
  });
  return testRepo().save(test);
}

export async function adminUpdateTest(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    part1Questions: string[];
    cueCardTopic: string;
    cueCardInstructions: string;
    prepTime: number;
    speakingTime: number;
    part3Questions: string[];
    totalDuration: number;
    perQuestionRecording: boolean;
    isActive: boolean;
  }>,
) {
  const test = await adminGetTest(id);
  Object.assign(test, data);
  return testRepo().save(test);
}

export async function adminDeleteTest(id: string) {
  await testRepo().delete(new ObjectId(id) as any);
}

export async function adminListSessions(testId?: string) {
  const where: any = {};
  if (testId) where.testId = testId;
  return sessionRepo().find({
    where,
    order: { createdAt: "DESC" } as any,
  });
}

export async function adminGetSession(sessionId: string) {
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
  partScores: { part1?: number; part2?: number; part3?: number },
  reviewedBy: string,
) {
  const session = await adminGetSession(sessionId);
  session.score = score;
  session.feedback = feedback;
  session.partScores = partScores;
  session.reviewedBy = reviewedBy;
  session.reviewedAt = new Date();
  return sessionRepo().save(session);
}

// ─── Student: list active tests ───────────────────────────────────────────────

export async function listActiveTests() {
  return testRepo().find({
    where: { isActive: true } as any,
    order: { createdAt: "DESC" } as any,
  });
}

export async function getTestForStudent(id: string) {
  const test = await testRepo().findOne({
    where: { _id: new ObjectId(id), isActive: true } as any,
  });
  if (!test) throw new Error("Speaking test not found or inactive");
  return test;
}

// ─── Student: Session management ─────────────────────────────────────────────

export async function startSession(
  userId: string,
  testId: string,
  mode: SpeakingTestMode,
) {
  // In exam mode, resume if active session exists
  if (mode === SpeakingTestMode.EXAM) {
    const existing = await sessionRepo().findOne({
      where: {
        userId,
        testId,
        mode: SpeakingTestMode.EXAM,
        status: SpeakingSessionStatus.ACTIVE,
      } as any,
    });
    if (existing) return { session: existing };
  }

  const test = await getTestForStudent(testId);
  const durationSeconds = test.totalDuration * 60;

  const session = sessionRepo().create({
    userId,
    testId,
    mode,
    status: SpeakingSessionStatus.ACTIVE,
    recordings: [],
    expiresAt: Date.now() + durationSeconds * 1000,
  });
  const saved = await sessionRepo().save(session);

  // Store global timer in Redis
  await redis.set(
    timerKey(userId, testId),
    String(session.expiresAt),
    "EX",
    durationSeconds + 60,
  );

  return { session: saved, test };
}

export async function getTimer(userId: string, testId: string) {
  const val = await redis.get(timerKey(userId, testId));
  if (!val) return null;
  return { expiresAt: parseInt(val, 10), now: Date.now() };
}

export async function setPartTimer(
  userId: string,
  testId: string,
  part: number,
  durationSeconds: number,
) {
  const expiresAt = Date.now() + durationSeconds * 1000;
  await redis.set(
    partTimerKey(userId, testId, part),
    String(expiresAt),
    "EX",
    durationSeconds + 10,
  );
  return { expiresAt, now: Date.now() };
}

export async function getPartTimer(
  userId: string,
  testId: string,
  part: number,
) {
  const val = await redis.get(partTimerKey(userId, testId, part));
  if (!val) return null;
  return { expiresAt: parseInt(val, 10), now: Date.now() };
}

export async function saveRecording(
  userId: string,
  testId: string,
  recording: {
    part: 1 | 2 | 3;
    questionIndex?: number;
    audioUrl: string;
    durationSeconds?: number;
  },
) {
  const session = await sessionRepo().findOne({
    where: {
      userId,
      testId,
      status: SpeakingSessionStatus.ACTIVE,
    } as any,
  });
  if (!session) throw new Error("No active session found");

  const rec: SpeakingRecording = {
    ...recording,
    uploadedAt: new Date().toISOString(),
  };

  session.recordings = [...(session.recordings ?? []), rec];
  return sessionRepo().save(session);
}

export async function submitSession(userId: string, testId: string) {
  const session = await sessionRepo().findOne({
    where: {
      userId,
      testId,
      status: SpeakingSessionStatus.ACTIVE,
    } as any,
  });
  if (!session) throw new Error("No active speaking session found");

  session.status = SpeakingSessionStatus.SUBMITTED;
  const saved = await sessionRepo().save(session);

  // Clean up Redis timers
  await redis.del(timerKey(userId, testId));
  await redis.del(partTimerKey(userId, testId, 1));
  await redis.del(partTimerKey(userId, testId, 2));
  await redis.del(partTimerKey(userId, testId, 3));

  return saved;
}

export async function getStudentSessions(userId: string) {
  return sessionRepo().find({
    where: { userId } as any,
    order: { createdAt: "DESC" } as any,
  });
}

export async function getSessionDetail(sessionId: string, userId: string) {
  const session = await sessionRepo().findOne({
    where: { _id: new ObjectId(sessionId) } as any,
  });
  if (!session) throw new Error("Session not found");
  if (session.userId !== userId) throw new Error("Unauthorized");
  return session;
}
