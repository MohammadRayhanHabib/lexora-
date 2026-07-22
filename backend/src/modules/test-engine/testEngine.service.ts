import { ObjectId } from "mongodb";
import { AppDataSource } from "../../config/database";
import { setTestLock, deleteTestLock } from "../../config/redis";
import { PracticeTest } from "../../entities/PracticeTest";
import { MockTest } from "../../entities/MockTest";
import { Attempt } from "../../entities/Attempt";
import { Subscription } from "../../entities/Subscription";
import {
  TestType,
  TestModule,
  AttemptStatus,
  SubscriptionStatus,
  AuditAction,
} from "../../types";
import { createAuditLog } from "../../middlewares/auditLogger";
import logger from "../../utils/logger";

const practiceRepo = () => AppDataSource.getMongoRepository(PracticeTest);
const mockRepo = () => AppDataSource.getMongoRepository(MockTest);
const attemptRepo = () => AppDataSource.getMongoRepository(Attempt);
const subRepo = () => AppDataSource.getMongoRepository(Subscription);

// ─── IELTS Band Score Mapping ──────────────────────────────
const listeningBandMap: Record<number, number> = {
  40: 9,
  39: 8.5,
  37: 8,
  35: 7.5,
  33: 7,
  30: 6.5,
  27: 6,
  23: 5.5,
  20: 5,
  16: 4.5,
  13: 4,
  10: 3.5,
  6: 3,
  4: 2.5,
  3: 2,
};

const readingBandMap: Record<number, number> = {
  40: 9,
  39: 8.5,
  37: 8,
  35: 7.5,
  33: 7,
  30: 6.5,
  27: 6,
  23: 5.5,
  20: 5,
  15: 4.5,
  13: 4,
  10: 3.5,
  8: 3,
  6: 2.5,
  4: 2,
};

function getBandScore(
  correct: number,
  total: number,
  module: TestModule,
): number {
  const map =
    module === TestModule.LISTENING ? listeningBandMap : readingBandMap;
  const scores = Object.entries(map)
    .map(([k, v]) => ({ min: parseInt(k), band: v }))
    .sort((a, b) => b.min - a.min);

  for (const entry of scores) {
    if (correct >= entry.min) return entry.band;
  }
  return 1;
}

export class TestEngineService {
  // ─── PRACTICE MODE ──────────────────────────────────────

  /**
   * List available practice tests by module
   */
  async listPracticeTests(module?: TestModule): Promise<PracticeTest[]> {
    const where: any = { isActive: true };
    if (module) where.module = module;
    return practiceRepo().find({ where, order: { createdAt: "DESC" } });
  }

  /**
   * Get practice test details
   */
  async getPracticeTest(testId: string): Promise<PracticeTest> {
    const test = await practiceRepo().findOne({
      where: { _id: new ObjectId(testId) as any },
    });
    if (!test) throw new Error("Practice test not found");
    return test;
  }

  /**
   * Start a practice test attempt
   */
  async startPracticeTest(
    userId: string,
    testId: string,
    module: TestModule,
    ipAddress?: string,
  ): Promise<Attempt> {
    const test = await this.getPracticeTest(testId);
    if (test.module !== module) throw new Error("Module mismatch");

    // Check subscription limits
    const sub = await subRepo().findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE as any },
    });
    if (
      sub &&
      sub.practiceTestsUsed >= sub.practiceTestsAllowed &&
      sub.practiceTestsAllowed > 0
    ) {
      throw new Error("Practice test limit reached for your subscription");
    }

    // Set test lock in Redis (prevent concurrent attempts)
    const locked = await setTestLock(userId, testId, 7200); // 2 hours
    if (!locked)
      throw new Error("You already have an active attempt for this test");

    // Calculate attempt number
    const previousAttempts = await attemptRepo().count({
      where: { userId, testId, testType: TestType.PRACTICE as any },
    });

    const attempt = new Attempt();
    attempt.userId = userId;
    attempt.testId = testId;
    attempt.testType = TestType.PRACTICE;
    attempt.module = module;
    attempt.status = AttemptStatus.IN_PROGRESS;
    attempt.attemptNumber = previousAttempts + 1;
    attempt.startedAt = new Date();
    attempt.ipAddress = ipAddress;
    attempt.completionPercentage = 0;
    attempt.timeTaken = 0;

    const saved = await attemptRepo().save(attempt);

    // Increment subscription usage
    if (sub) {
      await subRepo().updateOne(
        { _id: sub._id },
        { $inc: { practiceTestsUsed: 1 } },
      );
    }

    // Increment test total attempts
    await practiceRepo().updateOne(
      { _id: new ObjectId(testId) },
      { $inc: { totalAttempts: 1 } },
    );

    await createAuditLog({
      userId,
      action: AuditAction.TEST_STARTED,
      resourceType: "practice_test",
      resourceId: saved._id.toString(),
      details: { testId, module, attemptNumber: saved.attemptNumber },
    });

    return saved;
  }

  /**
   * Submit practice test answers
   */
  async submitPracticeTest(
    userId: string,
    attemptId: string,
    answers: Record<string, any>,
    timeTaken: number,
  ): Promise<Attempt> {
    const attempt = await attemptRepo().findOne({
      where: { _id: new ObjectId(attemptId) as any, userId },
    });
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.status !== AttemptStatus.IN_PROGRESS)
      throw new Error("Attempt already completed");

    const test = await this.getPracticeTest(attempt.testId);

    attempt.answers = answers;
    attempt.timeTaken = timeTaken;
    attempt.completedAt = new Date();
    attempt.status = AttemptStatus.COMPLETED;
    attempt.completionPercentage = 100;

    // Auto-score for Listening & Reading
    if (
      attempt.module === TestModule.LISTENING ||
      attempt.module === TestModule.READING
    ) {
      const scoreResult = this.autoScore(test, answers, attempt.module!);
      attempt.autoScores = {
        [attempt.module]: scoreResult,
      };
      attempt.overallBandScore = scoreResult.bandScore;
    }
    // Writing & Speaking — no auto-scoring. Must go through manual review.

    const saved = await attemptRepo().save(attempt);

    // Release test lock
    await deleteTestLock(userId, attempt.testId);

    await createAuditLog({
      userId,
      action: AuditAction.TEST_SUBMITTED,
      resourceType: "practice_test",
      resourceId: attemptId,
      details: {
        module: attempt.module,
        timeTaken,
        bandScore: attempt.overallBandScore,
      },
    });

    return saved;
  }

  /**
   * Get last 3 practice attempts for a user on a specific test
   */
  async getRecentPracticeAttempts(
    userId: string,
    testId: string,
  ): Promise<Attempt[]> {
    return attemptRepo().find({
      where: { userId, testId, testType: TestType.PRACTICE as any },
      order: { createdAt: "DESC" },
      take: 3,
    });
  }

  // ─── FULL MOCK MODE ─────────────────────────────────────

  /**
   * List available mock tests
   */
  async listMockTests(): Promise<MockTest[]> {
    return mockRepo().find({
      where: { isActive: true },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get mock test details
   */
  async getMockTest(testId: string): Promise<MockTest> {
    const test = await mockRepo().findOne({
      where: { _id: new ObjectId(testId) as any },
    });
    if (!test) throw new Error("Mock test not found");
    return test;
  }

  /**
   * Start a full mock test (all 4 modules)
   */
  async startMockTest(
    userId: string,
    testId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Attempt> {
    const test = await this.getMockTest(testId);

    // Check subscription limits
    const sub = await subRepo().findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE as any },
    });
    if (
      sub &&
      sub.mockTestsUsed >= sub.mockTestsAllowed &&
      sub.mockTestsAllowed > 0
    ) {
      throw new Error("Mock test limit reached for your subscription");
    }

    // Set test lock
    const locked = await setTestLock(userId, testId, 14400); // 4 hours
    if (!locked)
      throw new Error("You already have an active mock test attempt");

    const previousAttempts = await attemptRepo().count({
      where: { userId, testId, testType: TestType.MOCK as any },
    });

    const attempt = new Attempt();
    attempt.userId = userId;
    attempt.testId = testId;
    attempt.testType = TestType.MOCK;
    attempt.status = AttemptStatus.IN_PROGRESS;
    attempt.attemptNumber = previousAttempts + 1;
    attempt.startedAt = new Date();
    attempt.ipAddress = ipAddress;
    attempt.userAgent = userAgent;
    attempt.completionPercentage = 0;
    attempt.timeTaken = 0;

    const saved = await attemptRepo().save(attempt);

    if (sub) {
      await subRepo().updateOne(
        { _id: sub._id },
        { $inc: { mockTestsUsed: 1 } },
      );
    }

    await mockRepo().updateOne(
      { _id: new ObjectId(testId) },
      { $inc: { totalAttempts: 1 } },
    );

    await createAuditLog({
      userId,
      action: AuditAction.TEST_STARTED,
      resourceType: "mock_test",
      resourceId: saved._id.toString(),
      details: { testId, attemptNumber: saved.attemptNumber },
    });

    return saved;
  }

  /**
   * Submit full mock test
   * L/R → auto-scored instantly
   * W/S → hidden until manual review completed
   */
  async submitMockTest(
    userId: string,
    attemptId: string,
    answers: Record<string, any>,
    timeTaken: number,
  ): Promise<Attempt> {
    const attempt = await attemptRepo().findOne({
      where: { _id: new ObjectId(attemptId) as any, userId },
    });
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.status !== AttemptStatus.IN_PROGRESS)
      throw new Error("Attempt already completed");

    const test = await this.getMockTest(attempt.testId);

    attempt.answers = answers;
    attempt.timeTaken = timeTaken;
    attempt.completedAt = new Date();
    attempt.status = AttemptStatus.COMPLETED;
    attempt.completionPercentage = 100;

    // Auto-score L & R
    const listeningScore = this.autoScoreMock(test, answers, "listening");
    const readingScore = this.autoScoreMock(test, answers, "reading");

    attempt.autoScores = {
      listening: listeningScore,
      reading: readingScore,
    };

    // W/S scores are null — must go through manual review
    // Overall band score is only calculated after W/S reviews are completed

    const saved = await attemptRepo().save(attempt);
    await deleteTestLock(userId, attempt.testId);

    await createAuditLog({
      userId,
      action: AuditAction.TEST_SUBMITTED,
      resourceType: "mock_test",
      resourceId: attemptId,
      details: {
        timeTaken,
        listeningBand: listeningScore.bandScore,
        readingBand: readingScore.bandScore,
      },
    });

    return saved;
  }

  /**
   * Get attempt details
   */
  async getAttempt(attemptId: string, userId?: string): Promise<Attempt> {
    const where: any = { _id: new ObjectId(attemptId) as any };
    if (userId) where.userId = userId;
    const attempt = await attemptRepo().findOne({ where });
    if (!attempt) throw new Error("Attempt not found");
    return attempt;
  }

  /**
   * Get user's attempt history
   */
  async getUserAttempts(
    userId: string,
    testType?: TestType,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ attempts: Attempt[]; total: number }> {
    const where: any = { userId };
    if (testType) where.testType = testType;

    const [attempts, total] = await attemptRepo().findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { attempts, total };
  }

  // ─── AUTO SCORING HELPERS ───────────────────────────────

  private autoScore(
    test: PracticeTest,
    answers: Record<string, any>,
    module: TestModule,
  ): { correct: number; total: number; bandScore: number } {
    let correct = 0;
    let total = 0;

    if (module === TestModule.LISTENING && test.content.sections) {
      for (const section of test.content.sections) {
        for (const q of section.questions) {
          total++;
          const userAnswer = answers[`q${q.questionNumber}`];
          if (
            userAnswer &&
            userAnswer.toString().toLowerCase().trim() ===
              q.correctAnswer.toLowerCase().trim()
          ) {
            correct++;
          }
        }
      }
    }

    if (module === TestModule.READING && test.content.passages) {
      for (const passage of test.content.passages) {
        for (const q of passage.questions) {
          total++;
          const userAnswer = answers[`q${q.questionNumber}`];
          if (
            userAnswer &&
            userAnswer.toString().toLowerCase().trim() ===
              q.correctAnswer.toLowerCase().trim()
          ) {
            correct++;
          }
        }
      }
    }

    const bandScore = getBandScore(correct, total, module);
    return { correct, total, bandScore };
  }

  private autoScoreMock(
    test: MockTest,
    answers: Record<string, any>,
    module: "listening" | "reading",
  ): { correct: number; total: number; bandScore: number } {
    let correct = 0;
    let total = 0;

    const testModule = test[module];
    if (module === "listening") {
      for (const section of testModule.sections) {
        for (const q of section.questions) {
          total++;
          const userAnswer = answers[`${module}_q${q.questionNumber}`];
          if (
            userAnswer &&
            userAnswer.toString().toLowerCase().trim() ===
              q.correctAnswer.toLowerCase().trim()
          ) {
            correct++;
          }
        }
      }
    } else {
      for (const section of (testModule as any).sections) {
        for (const q of section.questions) {
          total++;
          const userAnswer = answers[`${module}_q${q.questionNumber}`];
          if (
            userAnswer &&
            userAnswer.toString().toLowerCase().trim() ===
              q.correctAnswer.toLowerCase().trim()
          ) {
            correct++;
          }
        }
      }
    }

    const bandScore = getBandScore(
      correct,
      total,
      module === "listening" ? TestModule.LISTENING : TestModule.READING,
    );
    return { correct, total, bandScore };
  }
}

export const testEngineService = new TestEngineService();
