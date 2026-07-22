import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum ListeningAttemptStatus {
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  ABANDONED = "abandoned",
}

export enum ListeningTestMode {
  PRACTICE = "practice",
  EXAM = "exam",
}

@Entity("listening_attempts")
export class ListeningAttempt {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  userId!: string;

  @Column()
  @Index()
  testId!: string;

  @Column({
    type: "enum",
    enum: ListeningTestMode,
    default: ListeningTestMode.PRACTICE,
  })
  mode!: ListeningTestMode;

  @Column({
    type: "enum",
    enum: ListeningAttemptStatus,
    default: ListeningAttemptStatus.IN_PROGRESS,
  })
  @Index()
  status!: ListeningAttemptStatus;

  /**
   * Map of questionId → student answer
   */
  @Column("simple-json", { nullable: true })
  answers?: Record<string, string>;

  /** Score out of total (computed on submit) */
  @Column({ nullable: true })
  score?: number;

  /** Total questions in the test (snapshot) */
  @Column({ nullable: true })
  totalQuestions?: number;

  /** Percent correct */
  @Column({ nullable: true })
  percentage?: number;

  /** Redis key: listening:timer:<userId>:<testId> */
  @Column({ nullable: true })
  timerKey?: string;

  /** Epoch ms when session expires */
  @Column({ nullable: true })
  expiresAt?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
