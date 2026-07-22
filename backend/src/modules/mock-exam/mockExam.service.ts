import { ObjectId } from "mongodb";
import { AppDataSource } from "../../config/database";
import { MockExam } from "../../entities/MockExam";
import {
  MockExamAttempt,
  MockExamAttemptStatus,
} from "../../entities/MockExamAttempt";
import logger from "../../utils/logger";

// ─── IELTS Band Score rounding (nearest 0.5) ──────────────────
function roundBand(avg: number): number {
  return Math.round(avg * 2) / 2;
}

// ─── Repositories ──────────────────────────────────────────────
const examRepo = () => AppDataSource.getMongoRepository(MockExam);
const attemptRepo = () => AppDataSource.getMongoRepository(MockExamAttempt);

export class MockExamService {
  // ═══════════════════════════════════════════════
  // ADMIN — Exam CRUD
  // ═══════════════════════════════════════════════

  async adminListExams(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [exams, total] = await examRepo().findAndCount({
      order: { createdAt: "DESC" } as any,
      skip,
      take: limit,
    });
    return { exams, total, page, limit };
  }

  async adminGetExam(examId: string) {
    const exam = await examRepo().findOne({
      where: { _id: new ObjectId(examId) as any },
    });
    if (!exam) throw new Error("Mock exam not found");
    return exam;
  }

  async adminCreateExam(
    data: {
      title: string;
      description?: string;
      listeningTestId?: string;
      readingPart1Id?: string;
      readingPart2Id?: string;
      readingPart3Id?: string;
      writingTask1Id?: string;
      writingTask2Id?: string;
      speakingTestId?: string;
      listeningDuration?: number;
      readingDuration?: number;
      writingDuration?: number;
      speakingDuration?: number;
      isActive?: boolean;
      academicNumber?: number;
      testNumber?: number;
    },
    adminId: string,
  ) {
    const exam = examRepo().create({
      ...data,
      listeningDuration: data.listeningDuration ?? 40,
      readingDuration: data.readingDuration ?? 60,
      writingDuration: data.writingDuration ?? 60,
      speakingDuration: data.speakingDuration ?? 15,
      isActive: data.isActive ?? true,
      createdBy: adminId,
    });
    return examRepo().save(exam);
  }

  async adminUpdateExam(examId: string, data: Partial<MockExam>) {
    const exam = await this.adminGetExam(examId);
    Object.assign(exam, data);
    return examRepo().save(exam);
  }

  async adminDeleteExam(examId: string) {
    const exam = await this.adminGetExam(examId);
    await examRepo().remove(exam);
  }

  // ═══════════════════════════════════════════════
  // ADMIN — Attempts & Grading
  // ═══════════════════════════════════════════════

  async adminListAttempts(
    examId?: string,
    status?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (examId) where.examId = examId;
    if (status) where.status = status;
    const [attempts, total] = await attemptRepo().findAndCount({
      where,
      order: { createdAt: "DESC" } as any,
      skip,
      take: limit,
    });
    return { attempts, total, page, limit };
  }

  async adminGetAttempt(attemptId: string) {
    const attempt = await attemptRepo().findOne({
      where: { _id: new ObjectId(attemptId) as any },
    });
    if (!attempt) throw new Error("Attempt not found");
    return attempt;
  }

  async adminGetPendingReviews() {
    // Attempts that need manual grading (writing or speaking not yet reviewed)
    const attempts = await attemptRepo().find({
      where: {
        status: MockExamAttemptStatus.COMPLETED,
        resultPublishedAt: null as any,
      } as any,
      order: { createdAt: "ASC" } as any,
    });
    return attempts;
  }

  async adminGradeWriting(
    attemptId: string,
    reviewerId: string,
    data: {
      writingBand: number;
      writingTask1Band?: number;
      writingTask2Band?: number;
      writingFeedback?: string;
    },
  ) {
    const attempt = await this.adminGetAttempt(attemptId);
    attempt.writingBand = data.writingBand;
    attempt.writingTask1Band = data.writingTask1Band;
    attempt.writingTask2Band = data.writingTask2Band;
    attempt.writingFeedback = data.writingFeedback;
    attempt.writingReviewedAt = new Date();
    attempt.writingReviewedBy = reviewerId;
    return attemptRepo().save(attempt);
  }

  async adminGradeSpeaking(
    attemptId: string,
    reviewerId: string,
    data: {
      speakingBand: number;
      speakingPart1Band?: number;
      speakingPart2Band?: number;
      speakingPart3Band?: number;
      speakingFeedback?: string;
    },
  ) {
    const attempt = await this.adminGetAttempt(attemptId);
    attempt.speakingBand = data.speakingBand;
    attempt.speakingPart1Band = data.speakingPart1Band;
    attempt.speakingPart2Band = data.speakingPart2Band;
    attempt.speakingPart3Band = data.speakingPart3Band;
    attempt.speakingFeedback = data.speakingFeedback;
    attempt.speakingReviewedAt = new Date();
    attempt.speakingReviewedBy = reviewerId;
    return attemptRepo().save(attempt);
  }

  async adminPublishResult(attemptId: string) {
    const attempt = await this.adminGetAttempt(attemptId);

    // Compute overall band from available bands
    const bands: number[] = [];
    if (attempt.listeningBand != null) bands.push(attempt.listeningBand);
    if (attempt.readingBand != null) bands.push(attempt.readingBand);
    if (attempt.writingBand != null) bands.push(attempt.writingBand);
    if (attempt.speakingBand != null) bands.push(attempt.speakingBand);

    if (bands.length > 0) {
      attempt.overallBand = roundBand(
        bands.reduce((a, b) => a + b, 0) / bands.length,
      );
    }

    attempt.resultPublishedAt = new Date();
    const saved = await attemptRepo().save(attempt);
    logger.info(`Mock exam result published: ${attemptId}`);
    return saved;
  }

  async adminGetAnalytics(examId?: string) {
    const where: any = examId ? { examId } : {};
    const attempts = await attemptRepo().find({ where });
    const completed = attempts.filter(
      (a) => a.status === MockExamAttemptStatus.COMPLETED,
    );

    const avg = (vals: (number | undefined)[]) => {
      const defined = vals.filter((v): v is number => v != null);
      return defined.length ? defined.reduce((a, b) => a + b, 0) / defined.length : null;
    };

    return {
      totalAttempts: attempts.length,
      completedAttempts: completed.length,
      avgListeningBand: avg(completed.map((a) => a.listeningBand)),
      avgReadingBand: avg(completed.map((a) => a.readingBand)),
      avgWritingBand: avg(completed.map((a) => a.writingBand)),
      avgSpeakingBand: avg(completed.map((a) => a.speakingBand)),
      avgOverallBand: avg(completed.map((a) => a.overallBand)),
      pendingWritingReviews: attempts.filter(
        (a) => a.writingSessionId && !a.writingReviewedAt,
      ).length,
      pendingSpeakingReviews: attempts.filter(
        (a) => a.speakingSessionId && !a.speakingReviewedAt,
      ).length,
      publishedResults: attempts.filter((a) => a.resultPublishedAt).length,
    };
  }

  // ═══════════════════════════════════════════════
  // STUDENT — Exam listing & attempt lifecycle
  // ═══════════════════════════════════════════════

  async listActiveExams() {
    return examRepo().find({
      where: { isActive: true } as any,
      order: { createdAt: "DESC" } as any,
    });
  }

  async getExamForStudent(examId: string) {
    const exam = await examRepo().findOne({
      where: { _id: new ObjectId(examId) as any, isActive: true } as any,
    });
    if (!exam) throw new Error("Mock exam not found or inactive");
    return exam;
  }

  async startOrResumeAttempt(userId: string, examId: string) {
    await this.getExamForStudent(examId);

    // Resume the latest non-completed attempt for this exam
    const existing = await attemptRepo().findOne({
      where: {
        userId,
        examId,
        status: { $ne: MockExamAttemptStatus.COMPLETED } as any,
      } as any,
      order: { createdAt: "DESC" } as any,
    });
    if (existing) return { attempt: existing, resumed: true };

    const attempt = attemptRepo().create({
      userId,
      examId,
      status: MockExamAttemptStatus.IN_PROGRESS,
      startedAt: new Date(),
    });
    const saved = await attemptRepo().save(attempt);
    logger.info(`Mock exam attempt started: ${saved._id} by user ${userId}`);
    return { attempt: saved, resumed: false };
  }

  async updateAttemptSection(
    attemptId: string,
    userId: string,
    patch: {
      listeningAttemptId?: string;
      readingAttempt1Id?: string;
      readingAttempt2Id?: string;
      readingAttempt3Id?: string;
      writingSessionId?: string;
      speakingSessionId?: string;
      listeningScore?: number;
      listeningTotalScore?: number;
      listeningBand?: number;
      readingScore?: number;
      readingTotalScore?: number;
      readingBand?: number;
      status?: MockExamAttemptStatus;
    },
  ) {
    const attempt = await attemptRepo().findOne({
      where: { _id: new ObjectId(attemptId) as any } as any,
    });
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.userId !== userId) throw new Error("Unauthorized");

    Object.assign(attempt, patch);

    // If all sections done, mark completed
    if (patch.status === MockExamAttemptStatus.COMPLETED) {
      attempt.completedAt = new Date();
    }

    return attemptRepo().save(attempt);
  }

  async getAttempt(attemptId: string, userId: string) {
    const attempt = await attemptRepo().findOne({
      where: { _id: new ObjectId(attemptId) as any } as any,
    });
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.userId !== userId) throw new Error("Unauthorized");
    return attempt;
  }

  async getUserAttempts(userId: string) {
    return attemptRepo().find({
      where: { userId } as any,
      order: { createdAt: "DESC" } as any,
    });
  }
}

export const mockExamService = new MockExamService();
