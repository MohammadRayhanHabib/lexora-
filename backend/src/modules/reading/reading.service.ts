import { ObjectId } from "mongodb";
import { AppDataSource } from "../../config/database";
import { redis } from "../../config/redis";
import { ReadingTest } from "../../entities/ReadingTest";
import {
  ReadingQuestion,
  ReadingQuestionType,
} from "../../entities/ReadingQuestion";
import {
  ReadingAttempt,
  ReadingAttemptStatus,
  ReadingAnswerEntry,
  ReadingAnswerResult,
} from "../../entities/ReadingAttempt";
import logger from "../../utils/logger";

// ─── Band Score Mapping (Academic Reading) ─────────────────
const readingBandMap: Array<{ min: number; band: number }> = [
  { min: 40, band: 9.0 },
  { min: 39, band: 8.5 },
  { min: 37, band: 8.0 },
  { min: 35, band: 7.5 },
  { min: 33, band: 7.0 },
  { min: 30, band: 6.5 },
  { min: 27, band: 6.0 },
  { min: 23, band: 5.5 },
  { min: 20, band: 5.0 },
  { min: 15, band: 4.5 },
  { min: 13, band: 4.0 },
  { min: 10, band: 3.5 },
  { min: 8, band: 3.0 },
  { min: 6, band: 2.5 },
  { min: 4, band: 2.0 },
];

function calcBandScore(correct: number): number {
  for (const entry of readingBandMap) {
    if (correct >= entry.min) return entry.band;
  }
  return 1.0;
}

// ─── Redis key helpers ─────────────────────────────────────
const timerKey = (attemptId: string) => `reading:timer:${attemptId}`;
const draftKey = (attemptId: string) => `reading:draft:${attemptId}`;

// ─── Answer equality check ─────────────────────────────────
function isAnswerCorrect(
  given: string | string[],
  correct: string | string[],
  qType: ReadingQuestionType,
): boolean {
  if (
    qType === ReadingQuestionType.FILL_IN_BLANKS ||
    qType === ReadingQuestionType.SENTENCE_COMPLETION
  ) {
    // Accept array of possible correct answers, case-insensitive
    const givenStr = Array.isArray(given) ? given[0] : given;
    const correctArr = Array.isArray(correct) ? correct : [correct];
    return correctArr.some(
      (c) => c.trim().toLowerCase() === (givenStr || "").trim().toLowerCase(),
    );
  }

  /** Short answer: single string, or multi-gap (notes) when correct is an array. */
  if (qType === ReadingQuestionType.SHORT_ANSWER) {
    if (Array.isArray(correct) && correct.length > 0) {
      const g = Array.isArray(given) ? given : [];
      const c = correct;
      if (g.length !== c.length) return false;
      for (let i = 0; i < c.length; i++) {
        const gv = (g[i] ?? "").toString().trim().toLowerCase();
        const accepted = String(c[i] ?? "")
          .split("|")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean);
        if (!accepted.length) {
          if (gv.length > 0) return false;
          continue;
        }
        if (!accepted.some((a) => a === gv)) return false;
      }
      return true;
    }
    const givenStr = Array.isArray(given) ? given[0] : given;
    const correctArr = Array.isArray(correct) ? correct : [correct];
    return correctArr.some(
      (c) => c.trim().toLowerCase() === (givenStr || "").trim().toLowerCase(),
    );
  }

  if (
    qType === ReadingQuestionType.NOTE_COMPLETION ||
    qType === ReadingQuestionType.SUMMARY_COMPLETION ||
    qType === ReadingQuestionType.FLOWCHART_COMPLETION ||
    qType === ReadingQuestionType.TABLE_COMPLETION ||
    qType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION
  ) {
    const g = Array.isArray(given) ? given : [];
    const c = Array.isArray(correct) ? correct : [];
    if (g.length !== c.length) return false;
    for (let i = 0; i < c.length; i++) {
      const gv = (g[i] ?? "").toString().trim().toLowerCase();
      const accepted = String(c[i] ?? "")
        .split("|")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);
      if (!accepted.length) {
        if (gv.length > 0) return false;
        continue;
      }
      if (!accepted.some((a) => a === gv)) return false;
    }
    return true;
  }

  if (
    qType === ReadingQuestionType.MCQ_MULTIPLE ||
    qType === ReadingQuestionType.DRAG_AND_DROP
  ) {
    // Order-insensitive set comparison
    const givenArr = (Array.isArray(given) ? given : [given]).map((s) =>
      s.trim().toLowerCase(),
    );
    const correctArr = (Array.isArray(correct) ? correct : [correct]).map((s) =>
      s.trim().toLowerCase(),
    );
    if (givenArr.length !== correctArr.length) return false;
    return correctArr.every((c) => givenArr.includes(c));
  }

  // Matching: one letter per paragraph slot (arrays, same length, order matters)
  if (
    qType === ReadingQuestionType.MATCHING_HEADINGS ||
    qType === ReadingQuestionType.MATCHING_INFORMATION ||
    qType === ReadingQuestionType.MATCHING_FEATURES ||
    qType === ReadingQuestionType.LIST_MATCHING ||
    qType === ReadingQuestionType.CLASSIFICATION ||
    qType === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS
  ) {
    const g = Array.isArray(given) ? given : [];
    const c = Array.isArray(correct) ? correct : [];
    if (g.length !== c.length) return false;
    for (let i = 0; i < c.length; i++) {
      const gv = (g[i] ?? "").toString().trim().toLowerCase();
      const cv = (c[i] ?? "").toString().trim().toLowerCase();
      if (gv !== cv) return false;
    }
    return true;
  }

  // Simple string compare (TRUE_FALSE_NG, MCQ_SINGLE, etc.)
  const givenStr = Array.isArray(given) ? given[0] : given;
  const correctStr = Array.isArray(correct) ? correct[0] : correct;
  return (
    (givenStr || "").trim().toLowerCase() === correctStr.trim().toLowerCase()
  );
}

/** Legacy records may store isActive as the string "true" from multipart forms. */
const ACTIVE_TEST_WHERE = { isActive: { $in: [true, "true"] } } as const;

function normalizeBooleanField(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
  }
  return undefined;
}

// ─── Repositories ──────────────────────────────────────────
const testRepo = () => AppDataSource.getMongoRepository(ReadingTest);
const questionRepo = () => AppDataSource.getMongoRepository(ReadingQuestion);
const attemptRepo = () => AppDataSource.getMongoRepository(ReadingAttempt);

export class ReadingService {
  // ═══════════════════════════════════════════════
  // ADMIN: Tests
  // ═══════════════════════════════════════════════

  async adminListTests(page = 1, limit = 100) {
    const skip = (page - 1) * limit;
    const [tests, total] = await testRepo().findAndCount({
      order: {
        academicNumber: "DESC",
        testNumber: "ASC",
        partNumber: "ASC",
        createdAt: "DESC",
      } as any,
      skip,
      take: limit,
    });
    return { tests, total, page, limit };
  }

  async adminGetTest(testId: string) {
    const test = await testRepo().findOne({
      where: { _id: new ObjectId(testId) as any },
    });
    if (!test) throw new Error("Reading test not found");
    return test;
  }

  async adminCreateTest(
    data: {
      title: string;
      passageTitle: string;
      passageContent: string;
      passageImage?: string;
      duration?: number;
      showExplanations?: boolean;
      academicNumber?: number;
      testNumber?: number;
      partNumber?: number;
      partTypeLabel?: string;
    },
    adminId: string,
  ) {
    const test = testRepo().create({
      title: data.title,
      passageTitle: data.passageTitle,
      passageContent: data.passageContent,
      passageImage: data.passageImage,
      duration: data.duration ?? 60,
      totalQuestions: 0,
      isActive: true,
      showExplanations: data.showExplanations ?? false,
      academicNumber: data.academicNumber,
      testNumber: data.testNumber,
      partNumber: data.partNumber,
      partTypeLabel: data.partTypeLabel,
      createdBy: adminId,
    });
    return testRepo().save(test);
  }

  async adminUpdateTest(
    testId: string,
    data: Partial<{
      title: string;
      passageTitle: string;
      passageContent: string;
      passageImage: string;
      duration: number;
      isActive: boolean;
      showExplanations: boolean;
      academicNumber: number;
      testNumber: number;
      partNumber: number;
      partTypeLabel: string;
    }>,
  ) {
    const test = await this.adminGetTest(testId);
    const patch = { ...data };
    if ("isActive" in patch) {
      const normalized = normalizeBooleanField(patch.isActive);
      if (normalized !== undefined) patch.isActive = normalized;
    }
    if ("showExplanations" in patch) {
      const normalized = normalizeBooleanField(patch.showExplanations);
      if (normalized !== undefined) patch.showExplanations = normalized;
    }
    Object.assign(test, patch);
    return testRepo().save(test);
  }

  async adminDeleteTest(testId: string) {
    const test = await this.adminGetTest(testId);
    // Delete all questions for this test
    await questionRepo().deleteMany({ readingTestId: testId } as any);
    await testRepo().remove(test);
  }

  // ═══════════════════════════════════════════════
  // ADMIN: Questions
  // ═══════════════════════════════════════════════

  async adminGetQuestions(testId: string) {
    return questionRepo().find({
      where: { readingTestId: testId } as any,
      order: { orderNumber: "ASC" } as any,
    });
  }

  async adminCreateQuestion(
    testId: string,
    data: {
      questionType: ReadingQuestionType;
      instructions?: string;
      questionText: string;
      options?: string[];
      wordBank?: string[];
      correctAnswer: string | string[];
      orderNumber: number;
      groupLabel?: string;
      pageNumber?: number;
      marks?: number;
      explanation?: string;
    },
  ) {
    // Verify test exists
    await this.adminGetTest(testId);

    const question = questionRepo().create({
      readingTestId: testId,
      ...data,
      marks: data.marks ?? 1,
    });
    const saved = await questionRepo().save(question);

    // Update totalQuestions counter
    await this._syncQuestionCount(testId);
    return saved;
  }

  async adminUpdateQuestion(
    questionId: string,
    data: Partial<{
      questionType: ReadingQuestionType;
      instructions: string;
      questionText: string;
      options: string[];
      wordBank: string[];
      correctAnswer: string | string[];
      orderNumber: number;
      groupLabel: string;
      pageNumber: number;
      marks: number;
      explanation: string;
    }>,
  ) {
    const q = await questionRepo().findOne({
      where: { _id: new ObjectId(questionId) as any },
    });
    if (!q) throw new Error("Question not found");
    Object.assign(q, data);
    return questionRepo().save(q);
  }

  async adminDeleteQuestion(questionId: string) {
    const q = await questionRepo().findOne({
      where: { _id: new ObjectId(questionId) as any },
    });
    if (!q) throw new Error("Question not found");
    const testId = q.readingTestId;
    await questionRepo().remove(q);
    await this._syncQuestionCount(testId);
  }

  async adminReorderQuestions(
    testId: string,
    order: { id: string; orderNumber: number }[],
  ) {
    const updates = order.map(({ id, orderNumber }) =>
      questionRepo().updateOne(
        { _id: new ObjectId(id) } as any,
        { $set: { orderNumber } } as any,
      ),
    );
    await Promise.all(updates);
    return { success: true };
  }

  private async _syncQuestionCount(testId: string) {
    const count = await questionRepo().count({
      where: { readingTestId: testId } as any,
    });
    await testRepo().updateOne(
      { _id: new ObjectId(testId) } as any,
      { $set: { totalQuestions: count } } as any,
    );
  }

  // ═══════════════════════════════════════════════
  // STUDENT: Test listing / preview
  // ═══════════════════════════════════════════════

  async listActiveTests() {
    return testRepo().find({
      where: { ...ACTIVE_TEST_WHERE } as any,
      order: {
        academicNumber: "DESC",
        testNumber: "ASC",
        partNumber: "ASC",
        createdAt: "DESC",
      } as any,
      select: [
        "_id",
        "title",
        "passageTitle",
        "duration",
        "totalQuestions",
        "createdAt",
        "academicNumber",
        "testNumber",
        "partNumber",
        "partTypeLabel",
      ] as any,
    });
  }

  /**
   * Returns tests grouped by academicNumber → testNumber → partNumber.
   * Un-grouped tests (no academicNumber) are returned in a special group.
   */
  async listActiveTestsGrouped() {
    const tests = await this.listActiveTests();

    // Group: academicNumber → testNumber → parts[]
    const grouped: Record<
      number,
      { academicNumber: number; tests: Record<number, typeof tests> }
    > = {};
    const ungrouped: typeof tests = [];

    for (const t of tests) {
      if (t.academicNumber == null) {
        ungrouped.push(t);
        continue;
      }
      if (!grouped[t.academicNumber]) {
        grouped[t.academicNumber] = {
          academicNumber: t.academicNumber,
          tests: {},
        };
      }
      const tn = t.testNumber ?? 0;
      if (!grouped[t.academicNumber].tests[tn]) {
        grouped[t.academicNumber].tests[tn] = [];
      }
      grouped[t.academicNumber].tests[tn].push(t);
    }

    // Convert to array, sort descending by academicNumber
    const academicGroups = Object.values(grouped)
      .sort((a, b) => b.academicNumber - a.academicNumber)
      .map((g) => ({
        academicNumber: g.academicNumber,
        tests: Object.entries(g.tests)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([testNum, parts]) => ({
            testNumber: Number(testNum),
            parts: (parts as typeof tests).sort(
              (a, b) => (a.partNumber ?? 0) - (b.partNumber ?? 0),
            ),
          })),
      }));

    return { academicGroups, ungrouped };
  }

  async getTestForStudent(testId: string) {
    const test = await testRepo().findOne({
      where: {
        _id: new ObjectId(testId) as any,
        ...ACTIVE_TEST_WHERE,
      } as any,
    });
    if (!test) throw new Error("Reading test not found or inactive");
    const questions = await questionRepo().find({
      where: { readingTestId: testId } as any,
      order: { orderNumber: "ASC" } as any,
    });
    // Strip correct answers for student-facing response
    const sanitized = questions.map((q) => ({
      _id: q._id,
      questionType: q.questionType,
      instructions: q.instructions,
      questionText: q.questionText,
      options: q.options,
      wordBank: q.wordBank,
      orderNumber: q.orderNumber,
      groupLabel: q.groupLabel,
      pageNumber: q.pageNumber ?? 1,
      marks: q.marks,
    }));
    return { test, questions: sanitized };
  }

  // ═══════════════════════════════════════════════
  // STUDENT: Attempt lifecycle
  // ═══════════════════════════════════════════════

  async startAttempt(userId: string, testId: string) {
    const test = await testRepo().findOne({
      where: {
        _id: new ObjectId(testId) as any,
        ...ACTIVE_TEST_WHERE,
      } as any,
    });
    if (!test) throw new Error("Reading test not found or inactive");

    // Check for existing in-progress attempt
    const existing = await attemptRepo().findOne({
      where: {
        userId,
        testId,
        status: ReadingAttemptStatus.IN_PROGRESS,
      } as any,
    });
    if (existing) {
      const timeLeft = await this.getTimeRemaining(existing._id.toString());
      return { attempt: existing, timeRemaining: timeLeft };
    }

    const now = new Date();
    const attempt = attemptRepo().create({
      userId,
      testId,
      answers: [],
      score: 0,
      totalScore: test.totalQuestions,
      status: ReadingAttemptStatus.IN_PROGRESS,
      startedAt: now,
    });
    const saved = await attemptRepo().save(attempt);

    // Store timer in Redis (TTL = duration in seconds)
    const durationSecs = test.duration * 60;
    const expireAt = Math.floor(Date.now() / 1000) + durationSecs;
    await redis.set(
      timerKey(saved._id.toString()),
      expireAt,
      "EX",
      durationSecs + 10,
    );

    logger.info(`Reading attempt started: ${saved._id} by user ${userId}`);
    return { attempt: saved, timeRemaining: durationSecs };
  }

  async getTimeRemaining(attemptId: string): Promise<number> {
    const val = await redis.get(timerKey(attemptId));
    if (!val) return 0;
    const expireAt = parseInt(val, 10);
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, expireAt - now);
  }

  async autoSaveAnswers(
    attemptId: string,
    userId: string,
    answers: ReadingAnswerEntry[],
  ) {
    const attempt = await attemptRepo().findOne({
      where: { _id: new ObjectId(attemptId) as any } as any,
    });
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.userId !== userId) throw new Error("Unauthorized");
    if (attempt.status !== ReadingAttemptStatus.IN_PROGRESS)
      throw new Error("Attempt already submitted");

    // Persist draft to Redis (auto-expire when timer expires + buffer)
    await redis.set(
      draftKey(attemptId),
      JSON.stringify(answers),
      "EX",
      4 * 3600,
    );
    return { saved: true };
  }

  async getDraftAnswers(attemptId: string): Promise<ReadingAnswerEntry[]> {
    const data = await redis.get(draftKey(attemptId));
    return data ? JSON.parse(data) : [];
  }

  async submitAttempt(
    attemptId: string,
    userId: string,
    submittedAnswers: ReadingAnswerEntry[],
  ) {
    const attempt = await attemptRepo().findOne({
      where: { _id: new ObjectId(attemptId) as any } as any,
    });
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.userId !== userId) throw new Error("Unauthorized");
    if (attempt.status !== ReadingAttemptStatus.IN_PROGRESS)
      throw new Error("Attempt already submitted");

    // Fetch questions with correct answers
    const questions = await questionRepo().find({
      where: { readingTestId: attempt.testId } as any,
      order: { orderNumber: "ASC" } as any,
    });

    let scoreTotal = 0;
    const results: ReadingAnswerResult[] = [];

    for (const q of questions) {
      const qId = q._id.toString();
      const given = submittedAnswers.find((a) => a.questionId === qId);
      const givenAnswer = given?.answer ?? [];
      const correct = isAnswerCorrect(
        givenAnswer,
        q.correctAnswer,
        q.questionType,
      );
      if (correct) scoreTotal += q.marks;
      results.push({
        questionId: qId,
        answer: givenAnswer,
        isCorrect: correct,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      });
    }

    const totalPossible = questions.reduce((s, q) => s + q.marks, 0);
    const timeRemaining = await this.getTimeRemaining(attemptId);
    const band = calcBandScore(scoreTotal);

    attempt.answers = submittedAnswers;
    attempt.results = results;
    attempt.score = scoreTotal;
    attempt.totalScore = totalPossible;
    attempt.bandScore = band;
    attempt.status = ReadingAttemptStatus.COMPLETED;
    attempt.submittedAt = new Date();
    attempt.timeRemaining = timeRemaining;

    const saved = await attemptRepo().save(attempt);

    // Clean up Redis
    await redis.del(timerKey(attemptId));
    await redis.del(draftKey(attemptId));

    // Optionally hide explanations based on test settings
    const test = await testRepo().findOne({
      where: { _id: new ObjectId(attempt.testId) as any } as any,
    });
    if (!test?.showExplanations) {
      saved.results = saved.results?.map((r) => ({
        ...r,
        explanation: undefined,
      }));
    }

    logger.info(
      `Reading attempt submitted: ${attemptId} score=${scoreTotal}/${totalPossible}`,
    );
    return saved;
  }

  async getAttempt(attemptId: string, userId: string) {
    const attempt = await attemptRepo().findOne({
      where: { _id: new ObjectId(attemptId) as any } as any,
    });
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.userId !== userId) throw new Error("Unauthorized");
    return attempt;
  }

  async getUserAttempts(userId: string, testId?: string) {
    const where: any = { userId };
    if (testId) where.testId = testId;
    return attemptRepo().find({
      where,
      order: { createdAt: "DESC" } as any,
    });
  }

  // Admin view of all attempts for a test
  async adminGetAttempts(testId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [attempts, total] = await attemptRepo().findAndCount({
      where: { testId } as any,
      order: { createdAt: "DESC" } as any,
      skip,
      take: limit,
    });
    return { attempts, total, page, limit };
  }
}

export const readingService = new ReadingService();
