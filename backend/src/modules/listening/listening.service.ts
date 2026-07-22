import { AppDataSource } from "../../config/database";
import { redis } from "../../config/redis";
import {
  ListeningTest,
  ListeningSection,
  ListeningQuestion,
  ListeningQuestionType,
} from "../../entities/ListeningTest";
import {
  buildAnswerKeyValue,
  listeningQuestionScoreSlots,
  countCorrectTableCells,
  countTableGapTokens,
  countMultiMcqPartialScore,
  multiMcqSelectCount,
  isListeningBoxMatching,
  listeningMatchStemCount,
  isListeningMapLabeling,
  countListeningFlowchartGaps,
  countListeningNoteGaps,
} from "./tableCompletion";
import {
  ListeningAttempt,
  ListeningAttemptStatus,
  ListeningTestMode,
} from "../../entities/ListeningAttempt";
import { ObjectId } from "mongodb";

// ─── Redis key helpers ────────────────────────────────────────────────────────
const timerKey = (userId: string, testId: string) =>
  `listening:timer:${userId}:${testId}`;
const draftKey = (userId: string, testId: string) =>
  `listening:draft:${userId}:${testId}`;

const testRepo = () => AppDataSource.getRepository(ListeningTest);
const attemptRepo = () => AppDataSource.getRepository(ListeningAttempt);

/** Resolve the in-progress row this session should write to (mode disambiguates practice vs exam on same test). */
async function findInProgressListeningAttempt(
  userId: string,
  testId: string,
  opts: { attemptId?: string | null; mode?: ListeningTestMode | null },
): Promise<ListeningAttempt | null> {
  const attemptId = opts.attemptId?.trim();
  if (attemptId && ObjectId.isValid(attemptId)) {
    const byId = await attemptRepo().findOne({
      where: {
        _id: new ObjectId(attemptId),
        userId,
        testId,
        status: ListeningAttemptStatus.IN_PROGRESS,
      } as any,
    });
    if (byId) return byId;
  }
  const where: Record<string, unknown> = {
    userId,
    testId,
    status: ListeningAttemptStatus.IN_PROGRESS,
  };
  if (
    opts.mode === ListeningTestMode.PRACTICE ||
    opts.mode === ListeningTestMode.EXAM
  ) {
    where.mode = opts.mode;
  }
  const rows = await attemptRepo().find({
    where: where as any,
    order: { createdAt: "DESC" } as any,
    take: 1,
  });
  return rows[0] ?? null;
}

function findQuestion(
  test: ListeningTest,
  qId: string,
): ListeningQuestion | undefined {
  for (const s of test.sections) {
    const q = s.questions.find((x) => x.id === qId);
    if (q) return q;
  }
  return undefined;
}

function computeAnswerKey(sections: ListeningSection[]): Record<string, string> {
  const answerKey: Record<string, string> = {};
  for (const section of sections) {
    for (const q of section.questions as ListeningQuestion[]) {
      const qId = (q as any).id ?? (q as any).questionId;
      if (qId == null || qId === "") continue;
      if (
        q.type === ListeningQuestionType.FLOWCHART_COMPLETION &&
        countListeningFlowchartGaps((q as any).options) < 1
      ) {
        continue;
      }
      if (
        q.type === ListeningQuestionType.NOTE_COMPLETION &&
        countListeningNoteGaps((q as any).options) < 1
      ) {
        continue;
      }
      if (
        q.type === ListeningQuestionType.TABLE_COMPLETION &&
        countTableGapTokens(q.options) < 1
      ) {
        continue;
      }
      if (
        q.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE &&
        (!(q as any).options?.length ||
          multiMcqSelectCount(q as ListeningQuestion) < 1)
      ) {
        continue;
      }
      if (
        q.type === ListeningQuestionType.MATCHING &&
        listeningMatchStemCount(q as ListeningQuestion) >= 1 &&
        !isListeningBoxMatching(q as ListeningQuestion)
      ) {
        continue;
      }
      if (
        q.type === ListeningQuestionType.MAP_LABELING &&
        String((q as any).mapImageUrl ?? "").trim() &&
        (!(q as any).options?.length)
      ) {
        continue;
      }
      answerKey[String(qId)] = buildAnswerKeyValue(q);
    }
  }
  return answerKey;
}

function totalListeningScoreSlots(test: ListeningTest): number {
  return test.sections.reduce(
    (acc, s) =>
      acc +
      s.questions.reduce(
        (a, q) => a + listeningQuestionScoreSlots(q as ListeningQuestion),
        0,
      ),
    0,
  );
}

// ─── Admin: Listening Test CRUD ───────────────────────────────────────────────

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
  if (!test) throw new Error("Listening test not found");
  return test;
}

export async function adminCreateTest(data: {
  title: string;
  description?: string;
  audioUrl: string;
  duration?: number;
  allowReplay?: boolean;
  isActive?: boolean;
  sections: ListeningSection[];
  createdBy: string;
}) {
  const answerKey = computeAnswerKey(data.sections);

  const test = testRepo().create({
    title: data.title,
    description: data.description,
    audioUrl: data.audioUrl,
    duration: data.duration ?? 40,
    allowReplay: data.allowReplay ?? false,
    sections: data.sections,
    answerKey,
    isActive: data.isActive ?? true,
    createdBy: data.createdBy,
  });
  return testRepo().save(test);
}

export async function adminUpdateTest(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    audioUrl: string;
    duration: number;
    allowReplay: boolean;
    sections: ListeningSection[];
    isActive: boolean;
  }>,
) {
  const test = await adminGetTest(id);
  if (data.title !== undefined) test.title = data.title;
  if (data.description !== undefined) test.description = data.description;
  if (data.audioUrl !== undefined) test.audioUrl = data.audioUrl;
  if (data.duration !== undefined) test.duration = data.duration;
  if (data.allowReplay !== undefined) test.allowReplay = data.allowReplay;
  if (data.isActive !== undefined) test.isActive = data.isActive;
  if (data.sections) {
    test.sections = data.sections;
    test.answerKey = computeAnswerKey(data.sections);
  }

  return testRepo().save(test);
}

export async function adminDeleteTest(id: string) {
  await testRepo().delete(new ObjectId(id) as any);
}

export async function adminGetAttempts(testId: string) {
  return attemptRepo().find({
    where: { testId } as any,
    order: { createdAt: "DESC" } as any,
  });
}

// ─── Student: list active tests ───────────────────────────────────────────────

export async function listActiveTests() {
  const [asBool, asStr] = await Promise.all([
    testRepo().find({
      where: { isActive: true } as any,
      order: { createdAt: "DESC" } as any,
    }),
    testRepo().find({
      where: { isActive: "true" as any } as any,
      order: { createdAt: "DESC" } as any,
    }),
  ]);
  const seen = new Set<string>();
  const merged: ListeningTest[] = [];
  for (const t of [...asBool, ...asStr]) {
    const id = String(t._id);
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(t);
    }
  }
  merged.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return merged;
}

export async function getTestForStudent(id: string) {
  const test = await testRepo().findOne({
    where: { _id: new ObjectId(id) } as any,
  });
  if (!test) throw new Error("Listening test not found or inactive");
  const active =
    test.isActive === true || (test as { isActive?: unknown }).isActive === "true";
  if (!active) throw new Error("Listening test not found or inactive");
  return test;
}

// ─── Student: Session management ─────────────────────────────────────────────

export async function startAttempt(
  userId: string,
  testId: string,
  mode: ListeningTestMode,
) {
  // In exam mode, resume a single in-flight exam attempt (same shape as new starts)
  if (mode === ListeningTestMode.EXAM) {
    const existing = await attemptRepo().findOne({
      where: {
        userId,
        testId,
        mode: ListeningTestMode.EXAM,
        status: ListeningAttemptStatus.IN_PROGRESS,
      } as any,
    });
    if (existing) {
      const test = await getTestForStudent(testId);
      return { attempt: existing, test };
    }
  }

  // Practice: only one in-progress session per user+test — abandon stale rows
  if (mode === ListeningTestMode.PRACTICE) {
    const stale = await attemptRepo().find({
      where: {
        userId,
        testId,
        mode: ListeningTestMode.PRACTICE,
        status: ListeningAttemptStatus.IN_PROGRESS,
      } as any,
    });
    for (const a of stale) {
      a.status = ListeningAttemptStatus.ABANDONED;
      await attemptRepo().save(a);
    }
  }

  const test = await getTestForStudent(testId);
  const durationSeconds = test.duration * 60;

  const attempt = attemptRepo().create({
    userId,
    testId,
    mode,
    status: ListeningAttemptStatus.IN_PROGRESS,
    answers: {},
    totalQuestions: totalListeningScoreSlots(test),
    timerKey: timerKey(userId, testId),
    expiresAt: Date.now() + durationSeconds * 1000,
  });
  const saved = await attemptRepo().save(attempt);

  // Store timer in Redis
  await redis.set(
    timerKey(userId, testId),
    String(attempt.expiresAt),
    "EX",
    durationSeconds + 60,
  );

  return { attempt: saved, test };
}

export async function getTimer(userId: string, testId: string) {
  const val = await redis.get(timerKey(userId, testId));
  if (!val) return null;
  return { expiresAt: parseInt(val, 10), now: Date.now() };
}

export async function autosaveAnswers(
  userId: string,
  testId: string,
  answers: Record<string, string>,
  opts?: { attemptId?: string | null; mode?: ListeningTestMode | null },
) {
  await redis.set(
    draftKey(userId, testId),
    JSON.stringify(answers),
    "EX",
    7200,
  );
  const attempt = await findInProgressListeningAttempt(userId, testId, {
    attemptId: opts?.attemptId,
    mode: opts?.mode ?? null,
  });
  if (attempt) {
    attempt.answers = answers;
    await attemptRepo().save(attempt);
  }
  return true;
}

export async function submitAttempt(
  userId: string,
  testId: string,
  answers: Record<string, string>,
  opts?: { attemptId?: string | null; mode?: ListeningTestMode | null },
) {
  const attempt = await findInProgressListeningAttempt(userId, testId, {
    attemptId: opts?.attemptId,
    mode: opts?.mode ?? null,
  });
  if (!attempt) throw new Error("No active attempt found");

  const test = await testRepo().findOne({
    where: { _id: new ObjectId(testId) } as any,
  });
  if (!test) throw new Error("Test not found");

  // Grade (iterate answer key so omitted answers count as wrong)
  const answerKey = test.answerKey ?? {};
  let correct = 0;
  const storedTotal = attempt.totalQuestions;
  const totalQ =
    storedTotal != null && storedTotal > 0
      ? storedTotal
      : totalListeningScoreSlots(test);

  for (const qId of Object.keys(answerKey)) {
    const correctAnswer = answerKey[qId] ?? "";
    const studentAnswer = answers[qId] ?? "";
    const q = findQuestion(test, qId);
    if (q?.type === ListeningQuestionType.TABLE_COMPLETION) {
      correct += countCorrectTableCells(
        typeof studentAnswer === "string" ? studentAnswer : "",
        correctAnswer,
      );
    } else if (q?.type === ListeningQuestionType.FLOWCHART_COMPLETION) {
      correct += countCorrectTableCells(
        typeof studentAnswer === "string" ? studentAnswer : "",
        correctAnswer,
      );
    } else if (q?.type === ListeningQuestionType.NOTE_COMPLETION) {
      correct += countCorrectTableCells(
        typeof studentAnswer === "string" ? studentAnswer : "",
        correctAnswer,
      );
    } else if (q?.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE) {
      correct += countMultiMcqPartialScore(
        typeof studentAnswer === "string" ? studentAnswer : "",
        correctAnswer,
      );
    } else if (
      q?.type === ListeningQuestionType.MATCHING &&
      isListeningBoxMatching(q as ListeningQuestion)
    ) {
      correct += countCorrectTableCells(
        typeof studentAnswer === "string" ? studentAnswer : "",
        correctAnswer,
      );
    } else if (
      q?.type === ListeningQuestionType.MAP_LABELING &&
      isListeningMapLabeling(q as ListeningQuestion)
    ) {
      correct += countCorrectTableCells(
        typeof studentAnswer === "string" ? studentAnswer : "",
        correctAnswer,
      );
    } else if (
      String(studentAnswer).trim().toLowerCase() ===
      String(correctAnswer).trim().toLowerCase()
    ) {
      correct++;
    }
  }

  attempt.answers = answers;
  attempt.score = correct;
  attempt.percentage = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
  attempt.status = ListeningAttemptStatus.SUBMITTED;

  const saved = await attemptRepo().save(attempt);

  try {
    await redis.del(timerKey(userId, testId));
    await redis.del(draftKey(userId, testId));
  } catch (e) {
    console.warn("[listening] submit: redis cleanup failed", e);
  }

  return saved;
}

export async function getStudentAttempts(userId: string) {
  return attemptRepo().find({
    where: { userId } as any,
    order: { createdAt: "DESC" } as any,
  });
}

export async function getAttemptDetail(attemptId: string, userId: string) {
  const attempt = await attemptRepo().findOne({
    where: { _id: new ObjectId(attemptId) } as any,
  });
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.userId !== userId) throw new Error("Unauthorized");
  return attempt;
}
