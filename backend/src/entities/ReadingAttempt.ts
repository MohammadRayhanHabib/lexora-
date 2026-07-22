import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum ReadingAttemptStatus {
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  ABANDONED = "abandoned",
}

export interface ReadingAnswerEntry {
  questionId: string;
  answer: string | string[]; // single answer or array
}

export interface ReadingAnswerResult extends ReadingAnswerEntry {
  isCorrect: boolean;
  correctAnswer: string | string[];
  explanation?: string;
}

@Entity("reading_attempts")
export class ReadingAttempt {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  userId!: string;

  @Column()
  @Index()
  testId!: string;

  @Column("json", { default: [] })
  answers!: ReadingAnswerEntry[];

  /** Populated after submission */
  @Column("json", { nullable: true })
  results?: ReadingAnswerResult[];

  @Column({ default: 0 })
  score!: number;

  @Column({ default: 0 })
  totalScore!: number;

  @Column({ nullable: true })
  bandScore?: number;

  @Column({
    type: "enum",
    enum: ReadingAttemptStatus,
    default: ReadingAttemptStatus.IN_PROGRESS,
  })
  @Index()
  status!: ReadingAttemptStatus;

  @Column()
  startedAt!: Date;

  @Column({ nullable: true })
  submittedAt?: Date;

  /** Seconds remaining when submitted (snapshot) */
  @Column({ nullable: true })
  timeRemaining?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
