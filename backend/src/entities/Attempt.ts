import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { TestType, TestModule, AttemptStatus } from "../types";

@Entity("attempts")
export class Attempt {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  userId!: string;

  @Column()
  @Index()
  testId!: string;

  @Column({ type: "enum", enum: TestType })
  @Index()
  testType!: TestType;

  @Column({ type: "enum", enum: TestModule, nullable: true })
  module?: TestModule; // Only for practice mode

  @Column({
    type: "enum",
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
  })
  @Index()
  status!: AttemptStatus;

  @Column({ default: 1 })
  attemptNumber!: number;

  // Answers submitted by user
  @Column("json", { nullable: true })
  answers?: Record<string, any>;

  // Auto-scored results (L/R only)
  @Column("json", { nullable: true })
  autoScores?: {
    listening?: { correct: number; total: number; bandScore: number };
    reading?: { correct: number; total: number; bandScore: number };
  };

  // Manual review results (W/S) — populated after review
  @Column("json", { nullable: true })
  manualScores?: {
    writing?: { bandScore: number; reviewRequestId: string };
    speaking?: { bandScore: number; reviewRequestId: string };
  };

  @Column({ nullable: true })
  overallBandScore?: number;

  @Column({ default: 0 })
  completionPercentage!: number;

  @Column({ default: 0 })
  timeTaken!: number; // in seconds

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
