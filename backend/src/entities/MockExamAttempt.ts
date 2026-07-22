import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum MockExamAttemptStatus {
  IN_PROGRESS = "in_progress",
  LISTENING_DONE = "listening_done",
  READING_DONE = "reading_done",
  WRITING_DONE = "writing_done",
  COMPLETED = "completed",
}

/**
 * Tracks a single student's full IELTS Mock Exam attempt.
 * Each section delegates to its own existing attempt entity
 * (ListeningAttempt, ReadingAttempt × 3, WritingSession, SpeakingSession).
 */
@Entity("mock_exam_attempts")
export class MockExamAttempt {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  userId!: string;

  @Column()
  @Index()
  examId!: string;

  @Column({
    type: "enum",
    enum: MockExamAttemptStatus,
    default: MockExamAttemptStatus.IN_PROGRESS,
  })
  @Index()
  status!: MockExamAttemptStatus;

  // ─── Delegated attempt / session IDs ──────────────────────────────

  @Column({ nullable: true })
  listeningAttemptId?: string;

  @Column({ nullable: true })
  readingAttempt1Id?: string; // Part 1

  @Column({ nullable: true })
  readingAttempt2Id?: string; // Part 2

  @Column({ nullable: true })
  readingAttempt3Id?: string; // Part 3

  @Column({ nullable: true })
  writingSessionId?: string;

  @Column({ nullable: true })
  speakingSessionId?: string;

  // ─── Auto-graded results (filled immediately on section submit) ────

  @Column({ nullable: true })
  listeningScore?: number;

  @Column({ nullable: true })
  listeningTotalScore?: number;

  @Column({ nullable: true })
  listeningBand?: number;

  @Column({ nullable: true })
  readingScore?: number;

  @Column({ nullable: true })
  readingTotalScore?: number;

  @Column({ nullable: true })
  readingBand?: number;

  // ─── Manual grades (set by admin within 48 hours) ─────────────────

  @Column({ nullable: true })
  writingBand?: number;

  @Column({ nullable: true })
  writingTask1Band?: number;

  @Column({ nullable: true })
  writingTask2Band?: number;

  @Column({ nullable: true })
  writingFeedback?: string;

  @Column({ nullable: true })
  writingReviewedAt?: Date;

  @Column({ nullable: true })
  writingReviewedBy?: string;

  @Column({ nullable: true })
  speakingBand?: number;

  @Column({ nullable: true })
  speakingPart1Band?: number;

  @Column({ nullable: true })
  speakingPart2Band?: number;

  @Column({ nullable: true })
  speakingPart3Band?: number;

  @Column({ nullable: true })
  speakingFeedback?: string;

  @Column({ nullable: true })
  speakingReviewedAt?: Date;

  @Column({ nullable: true })
  speakingReviewedBy?: string;

  // ─── Final result ──────────────────────────────────────────────────

  /** avg(L + R + W + S) rounded to nearest 0.5 */
  @Column({ nullable: true })
  overallBand?: number;

  @Column({ nullable: true })
  resultPublishedAt?: Date;

  // ─── Timestamps ───────────────────────────────────────────────────

  @Column()
  startedAt!: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
